package dev.theocloud.stitchchart.account;

import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;

/** Ends the stored sessions of an account. */
@Component
class UserSessions {

  private final FindByIndexNameSessionRepository<? extends Session> sessions;

  UserSessions(FindByIndexNameSessionRepository<? extends Session> sessions) {
    this.sessions = sessions;
  }

  void endAllExcept(AccountPrincipal principal, String keptSessionId) {
    sessions.findByPrincipalName(principal.getName()).keySet().stream()
        .filter(sessionId -> !sessionId.equals(keptSessionId))
        .forEach(sessions::deleteById);
  }
}
