package dev.theocloud.stitchchart.pattern;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/** The public link of a chart. The slug carries 128 random bits, so it cannot be guessed. */
@Entity
@Table(name = "share_links")
class ShareLink {

  private static final SecureRandom RANDOM = new SecureRandom();

  @Id
  @Column(name = "pattern_id")
  private UUID patternId;

  @Column(nullable = false, unique = true)
  private String slug;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  protected ShareLink() {}

  static String newSlug() {
    byte[] bytes = new byte[16];
    RANDOM.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  UUID getPatternId() {
    return patternId;
  }

  String getSlug() {
    return slug;
  }
}
