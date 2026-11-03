package dev.theocloud.stitchchart.stitch;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * A copy of a custom stitch inside a chart, so that a chart stays complete when the stitch changes
 * or goes. Its number is what the symbol layer refers to; built-in stitches stay below 1000.
 */
public record EmbeddedStitch(
    @Min(1000) int id,
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

  /** The first number that is free for custom stitches. */
  public static final int FIRST_ID = 1000;
}
