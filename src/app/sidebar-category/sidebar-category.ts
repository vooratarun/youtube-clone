import { Component, input } from '@angular/core';

@Component({
  selector: 'app-sidebar-category',
  imports: [],
  templateUrl: './sidebar-category.html',
  styleUrl: './sidebar-category.css'
})
export class SidebarCategoryComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
}

