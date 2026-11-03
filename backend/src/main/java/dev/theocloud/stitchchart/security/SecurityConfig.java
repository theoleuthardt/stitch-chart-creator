package dev.theocloud.stitchchart.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfFilter;

/**
 * Session cookie authentication for the single-page app: sessions live in Postgres, the CSRF token
 * travels in the cookie Angular reads, and an anonymous API call answers 401 instead of a redirect.
 */
@Configuration
class SecurityConfig {

  /** Attempts to sign in or register per address and minute. */
  private static final int MAX_SIGN_IN_ATTEMPTS = 30;

  /** Reads of shared charts per address and minute. */
  private static final int MAX_SHARE_READS = 120;

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      SecurityContextRepository securityContextRepository,
      @Value("${app.max-request-bytes}") long maxRequestBytes,
      @Value("${app.large-request-bytes}") long largeRequestBytes,
      @Value("${app.large-request-slots}") int largeRequestSlots)
      throws Exception {
    return http.authorizeHttpRequests(requests ->
            requests
                .requestMatchers("/api/health", "/api/share/**")
                .permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login")
                .permitAll()
                .anyRequest()
                .authenticated())
        .csrf(csrf -> csrf.spa())
        .securityContext(context -> context.securityContextRepository(securityContextRepository))
        .exceptionHandling(handling ->
            handling.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
        .logout(logout ->
            logout
                .logoutUrl("/api/auth/logout")
                .logoutSuccessHandler(
                    new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
        .addFilterBefore(
            new RateLimitFilter(SecurityConfig::isSignInRequest, MAX_SIGN_IN_ATTEMPTS),
            AnonymousAuthenticationFilter.class)
        .addFilterBefore(
            new RateLimitFilter(SecurityConfig::isShareRequest, MAX_SHARE_READS),
            AnonymousAuthenticationFilter.class)
        .addFilterBefore(
            new RequestSizeLimitFilter(maxRequestBytes, largeRequestBytes, largeRequestSlots),
            CsrfFilter.class)
        .build();
  }

  private static boolean isSignInRequest(HttpServletRequest request) {
    String path = request.getRequestURI();
    return "POST".equals(request.getMethod())
        && (path.equals("/api/auth/login") || path.equals("/api/auth/register"));
  }

  private static boolean isShareRequest(HttpServletRequest request) {
    return request.getRequestURI().startsWith("/api/share/");
  }

  @Bean
  SecurityContextRepository securityContextRepository() {
    return new HttpSessionSecurityContextRepository();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
  }
}
