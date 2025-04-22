import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private token: string | null = null;
  private username: string | null = null; 
  private apiUrl = 'http://localhost:3000'; 
  isAuthenticated = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
  
  }

  login(username: string, password: string) {
    return this.http.post<{ token: string }>(`${this.apiUrl}/auth/login`, { username, password }).pipe(
      tap((response) => {
        console.log('Login successful, token received:', response.token); // Log the token for debugging
        this.token = response.token;
        this.username = username;
        this.isAuthenticated.next(true);
        //localStorage.setItem('authToken', response.token); // Save token to localStorage
      })
    );
  }

  saveToken(token: string): void {
    this.token = token;
    localStorage.setItem('authToken', token); 
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('authToken');
  }

  getUsername(): string | null {
    return this.username;
  }

  logout(): void {
    this.token = null;
    this.username = null; 
    localStorage.removeItem('authToken');
    this.isAuthenticated.next(false);
  }

  register(username: string, password: string): Observable<any> {
    const body = { username, password };
    return this.http.post(`${this.apiUrl}/auth/register`, body);
  }

 
}
