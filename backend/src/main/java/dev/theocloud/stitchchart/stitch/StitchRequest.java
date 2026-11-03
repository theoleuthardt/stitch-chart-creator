package dev.theocloud.stitchchart.stitch;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * A custom stitch: a name and a drawing of lines and circles in a unit square. The drawing is plain
 * numbers on purpose, so a stitch can never carry markup into a page.
 */
public record StitchRequest(
    @NotBlank @Size(max = 60) String name,
    @NotBlank @Size(max = 12) @Pattern(regexp = "[\\p{L}\\p{N} ._+/-]+") String abbreviation,
    @NotNull @Size(max = 64)
        List<
                @NotNull @Size(min = 4, max = 4) List<
                    @NotNull @DecimalMin("0") @DecimalMax("1") Double>>
            lines,
    @NotNull @Size(max = 16)
        List<
                @NotNull @Size(min = 3, max = 3) List<
                    @NotNull @DecimalMin("0") @DecimalMax("1") Double>>
            circles) {

  /** A stitch without a drawing could not be told apart on a chart. */
  @AssertTrue
  public boolean isDrawn() {
    return lines == null || circles == null || !lines.isEmpty() || !circles.isEmpty();
  }
}
