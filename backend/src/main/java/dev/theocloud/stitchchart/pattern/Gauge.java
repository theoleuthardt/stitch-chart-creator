package dev.theocloud.stitchchart.pattern;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * The gauge a chart is worked in: stitches and rows per unit. The unit is one centimetre, ten
 * centimetres, one inch or four inches, the ways gauge is usually given.
 */
record Gauge(
    @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("1000") Double stitchesPerUnit,
    @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("1000") Double rowsPerUnit,
    @NotNull @Pattern(regexp = "cm|cm10|in|in4") String unit) {}
