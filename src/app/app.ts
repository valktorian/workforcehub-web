import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

type NavigationItem = {
  path: string;
  label: string;
  hint: string;
};

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly navigationItems: NavigationItem[] = [
    {
      path: '/',
      label: 'Dashboard',
      hint: 'App overview and key metrics'
    },
    {
      path: '/employees',
      label: 'Employees',
      hint: 'People directory and staffing data'
    },
    {
      path: '/schedule',
      label: 'Schedule',
      hint: 'Shift planning and coverage view'
    },
    {
      path: '/settings',
      label: 'Settings',
      hint: 'Workspace preferences and setup'
    }
  ];

  protected readonly exactMatchOptions = { exact: true };
  protected readonly defaultMatchOptions = { exact: false };
}
