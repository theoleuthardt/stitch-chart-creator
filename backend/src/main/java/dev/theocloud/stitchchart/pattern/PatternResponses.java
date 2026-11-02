package dev.theocloud.stitchchart.pattern;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Response bodies of the pattern routes. */
final class PatternResponses {

  private PatternResponses() {}

  record Full(
      UUID id,
      String title,
      String craftType,
      int width,
      int height,
      String[] palette,
      int[] cells,
      int[] symbols,
      String thumbnail,
      long version,
      Instant createdAt,
      Instant updatedAt) {

    static Full of(ChartPattern pattern) {
      return new Full(
          pattern.getId(),
          pattern.getTitle(),
          pattern.getCraftType(),
          pattern.getWidth(),
          pattern.getHeight(),
          pattern.getPalette(),
          pattern.getCells(),
          pattern.getSymbols(),
          pattern.getThumbnail(),
          pattern.getVersion(),
          pattern.getCreatedAt(),
          pattern.getUpdatedAt());
    }
  }

  /** A list entry: everything except the chart itself. */
  record Summary(
      UUID id,
      String title,
      String craftType,
      int width,
      int height,
      String thumbnail,
      Instant updatedAt) {}

  record Page(List<Summary> items, long total, int page, int size) {}
}
