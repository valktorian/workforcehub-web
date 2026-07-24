import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

type EditorMode = 'time' | 'leave' | null;
type ReviewDecision = 'approve' | 'reject';

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
  private range = { from: '', to: '' };
  private employeeId = '';

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly entries = signal<TimeEntry[]>([]);
  protected readonly timesheets = signal<Timesheet[]>([]);
  protected readonly balances = signal<{ leaveType: string; available: number; pending: number }[]>([]);
  protected readonly leaveTypes = signal<LeaveType[]>([]);
  protected readonly pendingLeaveRequests = signal<LeaveRequest[]>([]);
  protected readonly canApproveLeave = computed(() =>
    this.auth.hasAnyRole(['Manager', 'HRAdmin']),
  );
  protected readonly editor = signal<EditorMode>(null);
  protected readonly selectedEntry = signal<TimeEntry | null>(null);
  protected readonly confirmingDelete = signal(false);
  protected readonly reviewRequest = signal<LeaveRequest | null>(null);
  protected readonly reviewDecision = signal<ReviewDecision>('approve');
  protected reviewComment = '';
  protected readonly totalHours = computed(() =>
    this.entries().reduce((total, entry) => total + Number(entry.hours), 0),
  );

  protected timeForm = this.emptyTimeForm('');
  protected leaveForm = { leaveType: '', startDate: '', endDate: '', reason: '' };

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
    void this.service.getEmployeeId().then((id) => (this.employeeId = id));
  }

  protected closeEditor(): void {
    this.confirmingDelete.set(false);
    this.editor.set(null);
    this.selectedEntry.set(null);
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

  protected requestDeleteTimeEntry(): void {
    this.confirmingDelete.set(true);
  }

  protected cancelDeleteTimeEntry(): void {
    this.confirmingDelete.set(false);
  }

  protected async saveTimeEntry(): Promise<void> {
    if (!this.employeeId) return this.fail('Your employee profile could not be resolved.');
    this.saving.set(true);
    try {
      const request = { employeeId: this.employeeId, ...this.timeForm };
      const selected = this.selectedEntry();
      if (selected) await this.service.updateTimeEntry(selected.id, request);
      else await this.service.createTimeEntry(request);
      this.closeEditor();
      await this.reload();
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
      this.closeEditor();
      await this.reload();
    } catch {
      this.confirmingDelete.set(false);
      this.fail('Unable to delete the time entry.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async saveLeaveRequest(): Promise<void> {
    if (!this.employeeId) return this.fail('Your employee profile could not be resolved.');
    this.saving.set(true);
    try {
      const created = await this.service.createLeaveRequest({
        employeeId: this.employeeId,
        ...this.leaveForm,
      });
      await this.service.submitLeaveRequest(created.id);
      this.closeEditor();
      await this.reload();
    } catch {
      this.fail('Unable to create the leave request.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async submitTimesheet(sheet: Timesheet): Promise<void> {
    try {
      await this.service.submitTimesheet(sheet.id);
      await this.reload();
    } catch {
      this.fail('Unable to submit the timesheet.');
    }
  }

  protected openReview(request: LeaveRequest, decision: ReviewDecision): void {
    this.reviewRequest.set(request);
    this.reviewDecision.set(decision);
    this.reviewComment = '';
  }

  protected closeReview(): void {
    this.reviewRequest.set(null);
    this.reviewComment = '';
  }

  protected async confirmReview(): Promise<void> {
    const request = this.reviewRequest();
    if (!request) return;
    this.saving.set(true);
    try {
      await this.service.reviewLeaveRequest(
        request.id,
        this.reviewDecision(),
        this.reviewComment,
      );
      this.closeReview();
      await this.loadPendingApprovals();
      await this.reload();
    } catch {
      this.fail("La décision n'a pas pu être enregistrée.");
    } finally {
      this.saving.set(false);
    }
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
      const data = await this.service.load(this.range.from, this.range.to);
      this.entries.set(data.timeEntries);
      this.timesheets.set(data.timesheets);
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
          extendedProps: { kind: 'leave' },
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
      return;
    }
    const result = await this.service.getPendingLeaveRequests();
    this.pendingLeaveRequests.set(result.items);
  }

  private openCreate(arg: DateSelectArg): void {
    const date = this.dateOnly(arg.start);
    this.timeForm = this.emptyTimeForm(date, this.timeOnly(arg.start), this.timeOnly(arg.end));
    this.editor.set('time');
  }

  private openEvent(arg: EventClickArg): void {
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

  private fail(message: string): void {
    this.error.set(message);
  }
}
