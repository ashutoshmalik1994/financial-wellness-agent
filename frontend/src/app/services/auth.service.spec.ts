import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from './auth.service';
import { LoginResponse } from '../models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockResponse: LoginResponse = {
    token: 'mock.jwt.token',
    expiresIn: '8h',
    user: {
      _id: 'user123',
      employeeId: 'EMP001',
      name: 'Arjun Mehta',
      email: 'arjun@company.com',
      department: 'Engineering',
      designation: 'Senior SWE',
      role: 'employee',
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store token and user on successful login', () => {
    service.login({ employeeId: 'EMP001', password: 'Demo@1234' }).subscribe((res) => {
      expect(res.token).toBe('mock.jwt.token');
      expect(localStorage.getItem('fw_token')).toBe('mock.jwt.token');
      expect(service.currentUser()?.employeeId).toBe('EMP001');
    });

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('isLoggedIn() should return true when token exists', () => {
    localStorage.setItem('fw_token', 'some.token');
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('isLoggedIn() should return false when no token', () => {
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('logout() should clear token and user', () => {
    localStorage.setItem('fw_token', 'some.token');
    service.logout();
    expect(localStorage.getItem('fw_token')).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('getToken() should return stored token', () => {
    localStorage.setItem('fw_token', 'abc123');
    expect(service.getToken()).toBe('abc123');
  });
});
