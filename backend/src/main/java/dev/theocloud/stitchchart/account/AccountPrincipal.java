package dev.theocloud.stitchchart.account;

import java.io.Serializable;
import java.util.UUID;
import org.springframework.security.core.AuthenticatedPrincipal;

/** The signed-in user as it is kept in the session. Its name is the stable account id. */
public record AccountPrincipal(UUID id) implements AuthenticatedPrincipal, Serializable {

  @Override
  public String getName() {
    return id.toString();
  }
}
