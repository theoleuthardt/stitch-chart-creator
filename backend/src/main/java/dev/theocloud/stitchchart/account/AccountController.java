package dev.theocloud.stitchchart.account;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in user managing their own account. */
@RestController
@RequestMapping("/api/account")
class AccountController {

  private final AccountService accountService;
  private final UserSessions userSessions;

  AccountController(AccountService accountService, UserSessions userSessions) {
    this.accountService = accountService;
    this.userSessions = userSessions;
  }

  @PutMapping
  UserResponse updateProfile(
      @AuthenticationPrincipal AccountPrincipal principal,
      @Valid @RequestBody AccountRequests.UpdateProfile body) {
    return UserResponse.of(accountService.updateProfile(principal.id(), body));
  }

  @PutMapping("/password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void changePassword(
      @AuthenticationPrincipal AccountPrincipal principal,
      @Valid @RequestBody AccountRequests.ChangePassword body,
      HttpServletRequest request) {
    accountService.changePassword(principal.id(), body);
    userSessions.endAllExcept(principal, request.getSession().getId());
  }

  @DeleteMapping
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void delete(
      @AuthenticationPrincipal AccountPrincipal principal,
      @Valid @RequestBody AccountRequests.DeleteAccount body,
      HttpServletRequest request) {
    accountService.delete(principal.id(), body);
    String currentSession = request.getSession().getId();
    request.getSession().invalidate();
    SecurityContextHolder.clearContext();
    userSessions.endAllExcept(principal, currentSession);
  }
}
