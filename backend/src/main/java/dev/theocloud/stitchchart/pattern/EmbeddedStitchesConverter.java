package dev.theocloud.stitchchart.pattern;

import dev.theocloud.stitchchart.stitch.EmbeddedStitch;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/** Stores the stitches embedded in a chart as JSON text. */
@Converter
class EmbeddedStitchesConverter implements AttributeConverter<List<EmbeddedStitch>, String> {

  private static final JsonMapper JSON = JsonMapper.builder().build();

  @Override
  public String convertToDatabaseColumn(List<EmbeddedStitch> stitches) {
    return JSON.writeValueAsString(stitches);
  }

  @Override
  public List<EmbeddedStitch> convertToEntityAttribute(String json) {
    return JSON.readValue(json, new TypeReference<>() {});
  }
}
