import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg, DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import frLocale from '@fullcalendar/core/locales/fr';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { AuthService } from '../../core/auth/auth.service';
import { LeaveType, TimeEntry, Timesheet } from './models';
import { LeaveRequest } from './models';
import { SchedulePageService } from './services/schedule-page.service';

type EditorMode = 'time' | 'leave' | 'timesheet' | null;
type ReviewDecision = 'approve' | 'reject';
type ReviewKind = 'leave' | 'timesheet';

@Component({
  selector: 'app-schedule-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, FullCalendarModule],
  templateUrl: './schedule-page.html',
  styleUrl: './schedule-page.scss',
})
export class SchedulePage {
  private readonly service = inject(SchedulePageService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private range = { from: '', to: '' };
  private employeeId = '';
  private readonly requestedEmployeeId = this.route.snapshot.queryParamMap.get('employeeId');

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly entries = signal<TimeEntry[]>([]);
  protected readonly timesheets = signal<Timesheet[]>([]);
  protected readonly leaveRequests = signal<LeaveRequest[]>([]);
  protected readonly balances = signal<{ leaveType: string; available: number; pending: number }[]>([]);
  protected readonly leaveTypes = signal<LeaveType[]>([]);
  protected readonly pendingLeaveRequests = signal<LeaveRequest[]>([]);
  protected readonly pendingTimesheets = signal<Timesheet[]>([]);
  protected readonly canApproveLeave = computed(() =>
    this.auth.hasAnyRole(['Manager', 'HRManager', 'HRAdmin']),
  );
  protected readonly canReopenTimesheet = computed(() => this.auth.hasAnyRole(['HRAdmin']));
  protected readonly editor = signal<EditorMode>(null);
  protected readonly selectedEntry = signal<TimeEntry | null>(null);
  protected readonly selectedLeave = signal<LeaveRequest | null>(null);
  protected readonly confirmingDelete = signal(false);
  protected readonly reviewRequest = signal<LeaveRequest | null>(null);
  protected readonly reviewDecision = signal<ReviewDecision>('approve');
  protected readonly reviewKind = signal<ReviewKind>('leave');
  protected readonly reviewTimesheet = signal<Timesheet | null>(null);
  protected reviewComment = '';
  protected readonly totalHours = computed(() =>
    this.entries().reduce((total, entry) => total + Number(entry.hours), 0),
  );
  protected readonly employeeContextName = signal<string | null>(null);
  protected readonly employeeContext = computed(() => this.requestedEmployeeId !== null);
  protected readonly requestedView = this.route.snapshot.queryParamMap.get('view') ?? 'schedule';

  protected timeForm = this.emptyTimeForm('');
  protected leaveForm = { leaveType: '', startDate: '', endDate: '', reason: '' };
  protected timesheetForm = { periodStart: '', periodEnd: '' };

  protected readonly calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    locale: frLocale,
    initialView: 'timeGridWeek',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
    selectable: true,
    nowIndicator: true,
    allDaySlot: true,
    height: 720,
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    scrollTime: '08:00:00',
    scrollTimeReset: false,
    slotDuration: '00:30:00',
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    stickyHeaderDates: true,
    selectAllow: (selection) => !selection.allDay,
    select: (arg) => this.openCreate(arg),
    eventClick: (arg) => this.openEvent(arg),
    datesSet: (arg) => void this.loadRange(arg),
  };

  constructor() {
    if (this.requestedEmployeeId) {
      this.employeeId = this.requestedEmployeeId;
      void this.service
        .getEmployeeName(this.requestedEmployeeId)
        .then((name) => this.employeeContextName.set(name))
        .catch(() => this.employeeContextName.set('Selected employee'));
    } else {
      void this.service.getEmployeeId().then((id) => (this.employeeId = id));
    }
  }

  protected closeEditor(): void {
    this.confirmingDelete.set(false);
    this.editor.set(null);
    this.selectedEntry.set(null);
    this.selectedLeave.set(null);
  }

  protected openLeaveRequestForm(): void {
    const today = this.dateOnly(new Date());
    this.leaveForm = {
      leaveType: this.leaveTypes()[0]?.code ?? '',
      startDate: today,
      endDate: today,
      reason: '',
    };
    this.editor.set('leave');
  }

  protected openTimesheetForm(): void {
    const today = this.dateOnly(new Date());
    this.timesheetForm = { periodStart: today, periodEnd: today };
    this.editor.set('timesheet');
  }

  protected requestDeleteTimeEntry(): void {
    this.confirmingDelete.set(true);
  }

  protected cancelDeleteTimeEntry(): void {
    this.confirmingDelete.set(false);
  }

  protected async saveTimeEntry(): Promise<void> {
    if (!this.employeeId) return this.fail('Your employee profile could not be resolved.');
    if (!this.timeForm.projectCode.trim() || !this.timeForm.taskCode.trim()) {
      return this.fail('Project and task are required.');
    }
    this.saving.set(true);
    try {
      const request = { employeeId: this.employeeId, ...this.timeForm };
      const selected = this.selectedEntry();
      if (selected) {
        const result = await this.service.updateTimeEntry(selected.id, request);
        const updated: TimeEntry = {
          ...selected,
          ...request,
          hours: this.durationInHours(request.startTime, request.endTime),
          status: result.status,
        };
        this.entries.update((entries) =>
          entries.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
        this.replaceCalendarTimeEntry(updated);
      } else {
        const result = await this.service.createTimeEntry(request);
        const created: TimeEntry = {
          id: result.id,
          employeeId: request.employeeId,
          workDate: request.workDate,
          startTime: request.startTime,
          endTime: request.endTime,
          hours: this.durationInHours(request.startTime, request.endTime),
          projectCode: request.projectCode,
          taskCode: request.taskCode,
          notes: request.notes,
          status: result.status,
        };
        this.entries.update((entries) => [...entries, created]);
        if (Array.isArray(this.calendarOptions.events)) {
          this.calendarOptions.events = [
            ...this.calendarOptions.events,
            {
              id: created.id,
              title: `${created.projectCode} · ${created.hours}h`,
              start: `${this.dateOnly(created.workDate)}T${created.startTime}`,
              end: `${this.dateOnly(created.workDate)}T${created.endTime}`,
              classNames: ['event-work'],
              extendedProps: { kind: 'time', item: created },
            },
          ];
        }
      }
      this.closeEditor();
    } catch {
      this.fail('Unable to save the time entry.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteTimeEntry(): Promise<void> {
    const entry = this.selectedEntry();
    if (!entry) return;
    this.saving.set(true);
    try {
      await this.service.deleteTimeEntry(entry.id);
      this.entries.update((entries) => entries.filter((item) => item.id !== entry.id));
      if (Array.isArray(this.calendarOptions.events)) {
        this.calendarOptions.events = this.calendarOptions.events.filter(
          (event) => event.id !== entry.id,
        );
      }
      this.closeEditor();
    } catch {
      this.confirmingDelete.set(false);
      this.fail('Unable to delete the time entry.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async saveLeaveRequest(): Promise<void> {
    if (!this.employeeId) return this.fail('Your employee profile could not be resolved.');
    if (!this.leaveForm.leaveType || !this.leaveForm.startDate || !this.leaveForm.endDate) {
      return this.fail('Leave type, start date and end date are required.');
    }
    if (this.leaveForm.endDate < this.leaveForm.startDate) {
      return this.fail('Leave request end date cannot be before its start date.');
    }
    this.saving.set(true);
    try {
      const request = {
        employeeId: this.employeeId,
        ...this.leaveForm,
      };
      const selected = this.selectedLeave();
      if (selected) {
        const result = await this.service.updateLeaveRequest(selected.id, request);
        const updated: LeaveRequest = { ...selected, ...request, status: result.status };
        this.leaveRequests.update((requests) =>
          requests.map((item) => (item.id === updated.id ? updated : item)),
        );
        this.replaceCalendarLeave(updated);
      } else {
        const result = await this.service.createLeaveRequest(request);
        const created: LeaveRequest = {
          id: result.id,
          ...request,
          status: 'Draft',
        };
        this.leaveRequests.update((requests) => [...requests, created]);
        this.addCalendarLeave(created);
      }
      this.closeEditor();
    } catch {
      this.fail('Unable to create the leave request.');
    } finally {
      this.saving.set(false);
    }
  }

  protected editLeaveRequest(request: LeaveRequest): void {
    this.selectedLeave.set(request);
    this.leaveForm = {
      leaveType: request.leaveType,
      startDate: this.dateOnly(request.startDate),
      endDate: this.dateOnly(request.endDate),
      reason: request.reason ?? '',
    };
    this.editor.set('leave');
  }

  protected async submitLeaveRequest(request: LeaveRequest): Promise<void> {
    await this.runCommand(
      () => this.service.submitLeaveRequest(request.id),
      (status) => this.updateLeaveStatus(request.id, status),
      'Unable to submit the leave request.',
    );
  }

  protected async cancelLeaveRequest(request: LeaveRequest): Promise<void> {
    if (!window.confirm('Cancel this leave request?')) return;
    await this.runCommand(
      () => this.service.cancelLeaveRequest(request.id, 'Cancelled by employee.'),
      (status) => this.updateLeaveStatus(request.id, status),
      'Unable to cancel the leave request.',
    );
  }

  protected async createTimesheet(): Promise<void> {
    if (!this.employeeId) return this.fail('Your employee profile could not be resolved.');
    if (!this.timesheetForm.periodStart || !this.timesheetForm.periodEnd) {
      return this.fail('Timesheet start and end dates are required.');
    }
    if (this.timesheetForm.periodEnd < this.timesheetForm.periodStart) {
      return this.fail('Timesheet end date cannot be before its start date.');
    }
    this.saving.set(true);
    try {
      const result = await this.service.createTimesheet({
        employeeId: this.employeeId,
        ...this.timesheetForm,
      });
      const existing = this.timesheets().find((sheet) => sheet.id === result.id);
      if (!existing) {
        this.timesheets.update((sheets) => [
          ...sheets,
          {
            id: result.id,
            employeeId: this.employeeId,
            periodStart: this.timesheetForm.periodStart,
            periodEnd: this.timesheetForm.periodEnd,
            totalHours: 0,
            status: result.status,
          },
        ]);
      }
      this.closeEditor();
    } catch {
      this.fail('Unable to create the timesheet.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async submitTimesheet(sheet: Timesheet): Promise<void> {
    await this.runCommand(
      () => this.service.submitTimesheet(sheet.id),
      (status) => this.updateTimesheetStatus(sheet.id, status),
      'Unable to submit the timesheet.',
    );
  }

  protected openReview(request: LeaveRequest, decision: ReviewDecision): void {
    this.reviewRequest.set(request);
    this.reviewTimesheet.set(null);
    this.reviewKind.set('leave');
    this.reviewDecision.set(decision);
    this.reviewComment = '';
  }

  protected openTimesheetReview(sheet: Timesheet, decision: ReviewDecision): void {
    this.reviewTimesheet.set(sheet);
    this.reviewRequest.set(null);
    this.reviewKind.set('timesheet');
    this.reviewDecision.set(decision);
    this.reviewComment = '';
  }

  protected closeReview(): void {
    this.reviewRequest.set(null);
    this.reviewTimesheet.set(null);
    this.reviewComment = '';
  }

  protected async confirmReview(): Promise<void> {
    if (this.reviewKind() === 'timesheet') {
      const sheet = this.reviewTimesheet();
      if (!sheet) return;
      this.saving.set(true);
      try {
        const result = await this.service.reviewTimesheet(
          sheet.id,
          this.reviewDecision(),
          this.reviewComment,
        );
        this.pendingTimesheets.update((items) => items.filter((item) => item.id !== sheet.id));
        this.updateTimesheetStatus(sheet.id, result.status);
        this.closeReview();
      } catch {
        this.fail('The timesheet decision could not be saved.');
      } finally {
        this.saving.set(false);
      }
      return;
    }

    const request = this.reviewRequest();
    if (!request) return;
    this.saving.set(true);
    try {
      await this.service.reviewLeaveRequest(
        request.id,
        this.reviewDecision(),
        this.reviewComment,
      );
      this.pendingLeaveRequests.update((requests) =>
        requests.filter((item) => item.id !== request.id),
      );
      this.closeReview();
    } catch {
      this.fail("La décision n'a pas pu être enregistrée.");
    } finally {
      this.saving.set(false);
    }
  }

  protected async reopenTimesheet(sheet: Timesheet): Promise<void> {
    await this.runCommand(
      () => this.service.reopenTimesheet(sheet.id, 'Reopened by HR.'),
      (status) => this.updateTimesheetStatus(sheet.id, status),
      'Unable to reopen the timesheet.',
    );
  }

  private async loadRange(arg: DatesSetArg): Promise<void> {
    this.range = { from: this.dateOnly(arg.start), to: this.dateOnly(new Date(arg.end.getTime() - 1)) };
    await this.reload();
  }

  private async reload(): Promise<void> {
    if (!this.range.from) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = this.requestedEmployeeId
        ? await this.service.loadEmployee(this.requestedEmployeeId, this.range.from, this.range.to)
        : await this.service.load(this.range.from, this.range.to);
      this.entries.set(data.timeEntries);
      this.timesheets.set(data.timesheets);
      this.leaveRequests.set(data.leaveRequests);
      this.balances.set(data.leaveBalances);
      this.leaveTypes.set(data.leaveTypes);
      this.calendarOptions.events = [
        ...data.timeEntries.map<EventInput>((item) => ({
          id: item.id,
          title: `${item.projectCode} · ${item.hours}h`,
          start: `${this.dateOnly(item.workDate)}T${item.startTime}`,
          end: `${this.dateOnly(item.workDate)}T${item.endTime}`,
          classNames: ['event-work'],
          extendedProps: { kind: 'time', item },
        })),
        ...data.leaveRequests.map<EventInput>((item) => ({
          id: item.id,
          title: `${item.leaveType} · ${item.status}`,
          start: this.dateOnly(item.startDate),
          end: this.addDay(item.endDate),
          allDay: true,
          classNames: ['event-leave'],
          extendedProps: { kind: 'leave', item },
        })),
        ...data.holidays.map<EventInput>((item) => ({
          title: item.name,
          start: this.dateOnly(item.date),
          allDay: true,
          classNames: ['event-holiday'],
          extendedProps: { kind: 'holiday' },
        })),
      ];
      await this.loadPendingApprovals();
    } catch {
      this.fail('The schedule could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPendingApprovals(): Promise<void> {
    if (!this.canApproveLeave()) {
      this.pendingLeaveRequests.set([]);
      this.pendingTimesheets.set([]);
      return;
    }
    const [leaveRequests, timesheets] = await Promise.allSettled([
      this.service.getPendingLeaveRequests(),
      this.service.getPendingTimesheets(),
    ]);
    this.pendingLeaveRequests.set(
      leaveRequests.status === 'fulfilled' ? leaveRequests.value.items : [],
    );
    this.pendingTimesheets.set(
      timesheets.status === 'fulfilled' ? timesheets.value.items : [],
    );
  }

  private openCreate(arg: DateSelectArg): void {
    const date = this.dateOnly(arg.start);
    this.timeForm = this.emptyTimeForm(date, this.timeOnly(arg.start), this.timeOnly(arg.end));
    this.editor.set('time');
  }

  private openEvent(arg: EventClickArg): void {
    if (arg.event.extendedProps['kind'] === 'leave') {
      const item = arg.event.extendedProps['item'] as LeaveRequest;
      if (item.status.toLowerCase() === 'draft') this.editLeaveRequest(item);
      return;
    }
    if (arg.event.extendedProps['kind'] !== 'time') return;
    const item = arg.event.extendedProps['item'] as TimeEntry;
    this.selectedEntry.set(item);
    this.timeForm = {
      workDate: this.dateOnly(item.workDate),
      startTime: item.startTime.slice(0, 5),
      endTime: item.endTime.slice(0, 5),
      projectCode: item.projectCode,
      taskCode: item.taskCode,
      notes: item.notes ?? '',
    };
    this.editor.set('time');
  }

  private emptyTimeForm(workDate: string, startTime = '09:00', endTime = '17:00') {
    return { workDate, startTime, endTime, projectCode: '', taskCode: '', notes: '' };
  }

  private dateOnly(value: Date | string): string {
    return new Date(value).toISOString().slice(0, 10);
  }

  private timeOnly(value: Date): string {
    return value.toTimeString().slice(0, 5);
  }

  private addDay(value: string): string {
    const date = new Date(value);
    date.setDate(date.getDate() + 1);
    return this.dateOnly(date);
  }

  private durationInHours(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    return (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60;
  }

  private replaceCalendarTimeEntry(updated: TimeEntry): void {
    if (!Array.isArray(this.calendarOptions.events)) return;
    this.calendarOptions.events = this.calendarOptions.events.map((event) =>
      event.id === updated.id
        ? {
            id: updated.id,
            title: `${updated.projectCode} · ${updated.hours}h`,
            start: `${this.dateOnly(updated.workDate)}T${updated.startTime}`,
            end: `${this.dateOnly(updated.workDate)}T${updated.endTime}`,
            classNames: ['event-work'],
            extendedProps: { kind: 'time', item: updated },
          }
        : event,
    );
  }

  private addCalendarLeave(request: LeaveRequest): void {
    if (!Array.isArray(this.calendarOptions.events)) return;
    this.calendarOptions.events = [
      ...this.calendarOptions.events,
      this.leaveEvent(request),
    ];
  }

  private replaceCalendarLeave(updated: LeaveRequest): void {
    if (!Array.isArray(this.calendarOptions.events)) return;
    this.calendarOptions.events = this.calendarOptions.events.map((event) =>
      event.id === updated.id ? this.leaveEvent(updated) : event,
    );
  }

  private leaveEvent(request: LeaveRequest): EventInput {
    return {
      id: request.id,
      title: `${request.leaveType} · ${request.status}`,
      start: this.dateOnly(request.startDate),
      end: this.addDay(request.endDate),
      allDay: true,
      classNames: ['event-leave'],
      extendedProps: { kind: 'leave', item: request },
    };
  }

  private updateLeaveStatus(id: string, status: string): void {
    const current = this.leaveRequests().find((request) => request.id === id);
    if (!current) return;
    const updated: LeaveRequest = { ...current, status };
    this.leaveRequests.update((requests) =>
      requests.map((request) => (request.id === id ? updated : request)),
    );
    this.replaceCalendarLeave(updated);
  }

  private updateTimesheetStatus(id: string, status: string): void {
    this.timesheets.update((sheets) =>
      sheets.map((sheet) => (sheet.id === id ? { ...sheet, status } : sheet)),
    );
  }

  private async runCommand(
    command: () => Promise<{ status: string }>,
    update: (status: string) => void,
    errorMessage: string,
  ): Promise<void> {
    this.saving.set(true);
    try {
      const result = await command();
      update(result.status);
    } catch {
      this.fail(errorMessage);
    } finally {
      this.saving.set(false);
    }
  }

  private fail(message: string): void {
    this.error.set(message);
  }
}
