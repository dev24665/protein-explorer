import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service'; 

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Protein Explorer';
  @Input() isAuthenticated = false; 

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.authService.isAuthenticated.subscribe((authState) => {
      this.isAuthenticated = authState;
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
