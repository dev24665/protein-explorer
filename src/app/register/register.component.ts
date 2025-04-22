import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  username: string = '';
  password: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onRegister() {
    if (!this.username.trim() || !this.password.trim()) {
      alert('Username and password cannot be empty.');
      return;
    }
    this.authService.register(this.username, this.password).subscribe({
      next: (response) => {
        console.log(response.message); // Log the success message from the backend
        alert('Registration successful! Please log in.');
        this.router.navigate(['/login']); // Redirect to login page
      },
      error: (err) => {
        if (err.status === 400) {
          alert('Username already exists. Please choose a different username.');
        } else {
          alert('Registration failed. Please try again.');
        }
      }
    });
  }
}