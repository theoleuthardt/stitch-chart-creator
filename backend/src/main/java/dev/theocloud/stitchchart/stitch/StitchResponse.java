package dev.theocloud.stitchchart.stitch;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** A custom stitch as the API returns it. */
record StitchResponse(
    UUID id,
    String name,
    String abbreviation,
    List<List<Double>> lines,
    List<List<Double>> circles) {

  static StitchResponse of(CustomStitch stitch) {
    return new StitchResponse(
        stitch.getId(),
        stitch.getName(),
        stitch.getAbbreviation(),
        shapes(stitch.getLines(), 4),
        shapes(stitch.getCircles(), 3));
  }

  private static List<List<Double>> shapes(double[] flat, int size) {
    List<List<Double>> result = new ArrayList<>();
    for (int start = 0; start < flat.length; start += size) {
      List<Double> shape = new ArrayList<>();
      for (int index = start; index < start + size; index++) {
        shape.add(flat[index]);
      }
      result.add(shape);
    }
    return result;
  }
}
