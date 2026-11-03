package dev.theocloud.stitchchart.pattern;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Data access for {@link PatternProgress}. */
interface ProgressRepository extends JpaRepository<PatternProgress, UUID> {}
