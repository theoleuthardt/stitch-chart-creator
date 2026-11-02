package dev.theocloud.stitchchart.pattern;

import static dev.theocloud.stitchchart.TestAccounts.PASSWORD;
import static dev.theocloud.stitchchart.TestAccounts.signUp;
import static dev.theocloud.stitchchart.TestAccounts.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.theocloud.stitchchart.IntegrationTest;
import jakarta.servlet.http.Cookie;
import java.util.Collections;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@IntegrationTest
class PatternApiTests {

  private static final String VALID =
      """
      {"title":"Rose","craftType":"crossStitch","width":2,"height":2,
       "palette":["#ff0000","#00ff00"],"cells":[0,1,2,0]}\
      """;

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;
  @Autowired private ObjectMapper objectMapper;

  private ResultActions send(MockHttpServletRequestBuilder request, Cookie session, String body)
      throws Exception {
    return mockMvc.perform(
        request.cookie(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body));
  }

  private ResultActions create(Cookie session, String body) throws Exception {
    return send(post("/api/patterns"), session, body);
  }

  private JsonNode created(Cookie session) throws Exception {
    return objectMapper.readTree(
        create(session, VALID)
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  private static String withVersion(String body, long version) {
    return body.substring(0, body.lastIndexOf('}')) + ",\"version\":" + version + "}";
  }

  @Test
  void aCreatedPatternCanBeLoaded() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());

    String id = created(session).get("id").asString();

    mockMvc
        .perform(get("/api/patterns/" + id).cookie(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Rose"))
        .andExpect(jsonPath("$.craftType").value("crossStitch"))
        .andExpect(jsonPath("$.width").value(2))
        .andExpect(jsonPath("$.palette[1]").value("#00ff00"))
        .andExpect(jsonPath("$.cells[1]").value(1))
        .andExpect(jsonPath("$.version").isNumber())
        .andExpect(jsonPath("$.createdAt").isNotEmpty())
        .andExpect(jsonPath("$.ownerId").doesNotExist());
  }

  @Test
  void savingReplacesThePatternAndRaisesTheVersion() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    JsonNode pattern = created(session);
    String id = pattern.get("id").asString();
    long version = pattern.get("version").asLong();

    send(
            put("/api/patterns/" + id),
            session,
            withVersion(VALID.replace("Rose", "Tulip").replace("[0,1,2,0]", "[2,2,2,2]"), version))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Tulip"))
        .andExpect(jsonPath("$.version").value(version + 1));

    mockMvc
        .perform(get("/api/patterns/" + id).cookie(session))
        .andExpect(jsonPath("$.cells[0]").value(2));
  }

  @Test
  void aStaleSaveIsRejected() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    JsonNode pattern = created(session);
    String id = pattern.get("id").asString();
    long version = pattern.get("version").asLong();
    send(put("/api/patterns/" + id), session, withVersion(VALID, version))
        .andExpect(status().isOk());

    send(put("/api/patterns/" + id), session, withVersion(VALID, version))
        .andExpect(status().isConflict());
  }

  @Test
  void savingNeedsAVersion() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = created(session).get("id").asString();

    send(put("/api/patterns/" + id), session, VALID).andExpect(status().isBadRequest());
  }

  @Test
  void aDeletedPatternIsGone() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = created(session).get("id").asString();

    mockMvc
        .perform(delete("/api/patterns/" + id).cookie(session).with(csrf()))
        .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/patterns/" + id).cookie(session)).andExpect(status().isNotFound());
  }

  @Test
  void anotherUsersPatternLooksLikeItDoesNotExist() throws Exception {
    String id = created(signUp(mockMvc, uniqueName())).get("id").asString();
    Cookie stranger = signUp(mockMvc, uniqueName());

    mockMvc.perform(get("/api/patterns/" + id).cookie(stranger)).andExpect(status().isNotFound());
    send(put("/api/patterns/" + id), stranger, withVersion(VALID, 0))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(delete("/api/patterns/" + id).cookie(stranger).with(csrf()))
        .andExpect(status().isNotFound());
  }

  @Test
  void theListShowsOnlyOwnPatternsAndNoCells() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    created(session);
    created(session);
    created(signUp(mockMvc, uniqueName()));

    mockMvc
        .perform(get("/api/patterns").cookie(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items", hasSize(2)))
        .andExpect(jsonPath("$.total").value(2))
        .andExpect(jsonPath("$.items[0].title").value("Rose"))
        .andExpect(jsonPath("$.items[0].cells").doesNotExist())
        .andExpect(jsonPath("$.items[0].palette").doesNotExist());
  }

  @Test
  void theListIsPaginatedWithTheNewestFirst() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    created(session);
    String newest = created(session).get("id").asString();

    mockMvc
        .perform(get("/api/patterns?page=0&size=1").cookie(session))
        .andExpect(jsonPath("$.items", hasSize(1)))
        .andExpect(jsonPath("$.items[0].id").value(newest))
        .andExpect(jsonPath("$.total").value(2));
  }

  @Test
  void aHugePageSizeIsRejected() throws Exception {
    mockMvc
        .perform(get("/api/patterns?size=100000").cookie(signUp(mockMvc, uniqueName())))
        .andExpect(status().isBadRequest());
  }

  @Test
  void invalidPatternsAreRejected() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());

    String[] invalid = {
      VALID.replace("\"Rose\"", "\"  \""),
      VALID.replace("\"Rose\"", "\"" + "x".repeat(201) + "\""),
      VALID.replace("crossStitch", "painting"),
      VALID.replace("\"width\":2", "\"width\":0"),
      VALID.replace("\"height\":2", "\"height\":-2"),
      VALID.replace("[0,1,2,0]", "[0,1,2]"),
      VALID.replace("[0,1,2,0]", "[0,1,3,0]"),
      VALID.replace("[0,1,2,0]", "[0,1,-1,0]"),
      VALID.replace("\"#ff0000\"", "\"red\""),
      VALID.replace("\"cells\":[0,1,2,0]", "\"cells\":[0,1,2,0],\"symbols\":[1]"),
      VALID.replace("\"cells\":[0,1,2,0]", "\"cells\":[0,1,2,0],\"thumbnail\":\"javascript:x\""),
    };

    for (String body : invalid) {
      create(session, body).andExpect(status().isBadRequest());
    }
  }

  @Test
  void aThumbnailAndSymbolsAreKept() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String body =
        VALID.replace(
            "\"cells\":[0,1,2,0]",
            "\"cells\":[0,1,2,0],\"symbols\":[3,0,0,4],\"thumbnail\":\"data:image/png;base64,AAAA\"");

    String id =
        objectMapper
            .readTree(
                create(session, body)
                    .andExpect(status().isCreated())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .get("id")
            .asString();

    mockMvc
        .perform(get("/api/patterns/" + id).cookie(session))
        .andExpect(jsonPath("$.symbols[3]").value(4));
    mockMvc
        .perform(get("/api/patterns").cookie(session))
        .andExpect(jsonPath("$.items[0].thumbnail").value("data:image/png;base64,AAAA"));
  }

  @Test
  void aLargeChartFits() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    int side = 1000;
    String cells = String.join(",", Collections.nCopies(side * side, "1"));
    String body =
        """
        {"title":"Large","craftType":"crossStitch","width":%d,"height":%d,
         "palette":["#000000"],"cells":[%s]}\
        """
            .formatted(side, side, cells);

    String id =
        objectMapper
            .readTree(
                create(session, body)
                    .andExpect(status().isCreated())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .get("id")
            .asString();

    String loaded =
        mockMvc
            .perform(get("/api/patterns/" + id).cookie(session))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(objectMapper.readTree(loaded).get("cells").size()).isEqualTo(side * side);
  }

  @Test
  void deletingAnAccountDeletesItsPatterns() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = created(session).get("id").asString();

    send(delete("/api/account"), session, "{\"password\":\"%s\"}".formatted(PASSWORD))
        .andExpect(status().isNoContent());

    assertThat(
            jdbcTemplate.queryForObject(
                "select count(*) from patterns where id = ?::uuid", Integer.class, id))
        .isZero();
  }

  @Test
  void patternsNeedASession() throws Exception {
    mockMvc.perform(get("/api/patterns")).andExpect(status().isUnauthorized());
  }
}
