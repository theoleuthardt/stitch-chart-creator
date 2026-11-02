import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountSettings } from './account-settings';

describe('AccountSettings', () => {
  it('does not send a second request while one is running', async () => {
    TestBed.configureTestingModule({
      imports: [AccountSettings],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AccountSettings);
    await fixture.whenStable();
    const http = TestBed.inject(HttpTestingController);
    fixture.componentInstance.password.setValue({
      currentPassword: 'an old passphrase',
      newPassword: 'a brand new passphrase',
    });

    void fixture.componentInstance.savePassword();
    void fixture.componentInstance.savePassword();

    expect(http.match('/api/account/password')).toHaveLength(1);
  });
});
