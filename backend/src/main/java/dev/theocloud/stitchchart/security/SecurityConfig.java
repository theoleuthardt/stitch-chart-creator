package dev.theocloud.stitchchart.security;

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

/**
 * Session cookie authentication for the single-page app: sessions live in Postgres, the CSRF token
 * travels in the cookie Angular reads, and an anonymous API call answers 401 instead of a redirect.
 */
@Configuration
class SecurityConfig {

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http, SecurityContextRepository securityContextRepository) throws Exception {
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
        .addFilterBefore(new AuthRateLimitFilter(), AnonymousAuthenticationFilter.class)
        .build();
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
