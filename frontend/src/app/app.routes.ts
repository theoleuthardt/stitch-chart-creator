import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './api/auth.guard';
import { AccountSettings } from './features/account/account-settings';
import { Register } from './features/auth/register';
import { SignIn } from './features/auth/sign-in';
import { Editor } from './features/editor/editor';
import { ImageImport } from './features/import/image-import';
import { Library } from './features/library/library';
import { Work } from './features/work/work';

/** All screens of the app. */
export const routes: Routes = [
  { path: '', component: Library, canActivate: [authGuard], title: 'Your charts' },
  { path: 'charts/:id', component: Editor, canActivate: [authGuard], title: 'Editor' },
  { path: 'charts/:id/work', component: Work, canActivate: [authGuard], title: 'Work mode' },
  { path: 'import', component: ImageImport, canActivate: [authGuard], title: 'Import an image' },
  { path: 'account', component: AccountSettings, canActivate: [authGuard], title: 'Account' },
  { path: 'sign-in', component: SignIn, canActivate: [guestGuard], title: 'Sign in' },
  { path: 'register', component: Register, canActivate: [guestGuard], title: 'Create account' },
  { path: '**', redirectTo: '' },
];
