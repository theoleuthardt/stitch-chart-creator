package dev.theocloud.stitchchart.pattern;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Data access for {@link ShareLink}. */
interface ShareLinkRepository extends JpaRepository<ShareLink, UUID> {

  Optional<ShareLink> findBySlug(String slug);
}
