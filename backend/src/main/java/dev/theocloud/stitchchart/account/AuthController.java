package dev.theocloud.stitchchart.account;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Registration, sign-in and the current user. Signing out is handled by the security filters. */
@RestController
@RequestMapping("/api/auth")
class AuthController {

  private final AccountService accountService;
  private final SecurityContextRepository securityContextRepository;

  AuthController(
      AccountService accountService, SecurityContextRepository securityContextRepository) {
    this.accountService = accountService;
    this.securityContextRepository = securityContextRepository;
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  UserResponse register(
      @Valid @RequestBody AuthRequests.Register body,
      HttpServletRequest request,
      HttpServletResponse response) {
    UserAccount account = accountService.register(body);
    signIn(account, request, response);
    return UserResponse.of(account);
  }

  @PostMapping("/login")
  UserResponse login(
      @Valid @RequestBody AuthRequests.Login body,
      HttpServletRequest request,
      HttpServletResponse response) {
    UserAccount account = accountService.authenticate(body);
    signIn(account, request, response);
    return UserResponse.of(account);
  }

  @GetMapping("/me")
  UserResponse me(@AuthenticationPrincipal AccountPrincipal principal) {
    return UserResponse.of(accountService.get(principal.id()));
  }

  private void signIn(
      UserAccount account, HttpServletRequest request, HttpServletResponse response) {
    if (request.getSession(false) != null) {
      request.changeSessionId();
    }
    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(
        UsernamePasswordAuthenticationToken.authenticated(
            new AccountPrincipal(account.getId()), null, List.of()));
    SecurityContextHolder.setContext(context);
    securityContextRepository.saveContext(context, request, response);
  }
}
