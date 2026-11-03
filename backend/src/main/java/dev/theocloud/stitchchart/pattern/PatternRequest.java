package dev.theocloud.stitchchart.pattern;

import dev.theocloud.stitchchart.stitch.EmbeddedStitch;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/** The body of creating or saving a pattern. Saving also needs the version that was loaded. */
record PatternRequest(
    @NotBlank @Size(max = 200) String title,
    @NotNull @Pattern(regexp = "crossStitch|knitting|crochet|pixelArt") String craftType,
    @Min(1) int width,
    @Min(1) int height,
    @NotNull @Size(max = 4096) List<@NotNull @Pattern(regexp = "#[0-9a-fA-F]{6}") String> palette,
    @NotNull int[] cells,
    int[] symbols,
    @Size(max = 256) List<@NotNull @Valid EmbeddedStitch> customStitches,
    @Size(max = 65536) @Pattern(regexp = "data:image/png;base64,[A-Za-z0-9+/=]*") String thumbnail,
    Long version) {}
