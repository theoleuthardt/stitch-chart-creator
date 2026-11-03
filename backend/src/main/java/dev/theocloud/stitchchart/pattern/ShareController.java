package dev.theocloud.stitchchart.pattern;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * The only public way to a chart. It is not cached, so that revoking a link takes effect at once.
 */
@RestController
class ShareController {

  private final PatternService patternService;

  ShareController(PatternService patternService) {
    this.patternService = patternService;
  }

  @GetMapping("/api/share/{slug}")
  ResponseEntity<PatternResponses.Shared> read(@PathVariable String slug) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(patternService.readShared(slug));
  }
}
