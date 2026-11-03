package dev.theocloud.stitchchart.stitch;

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
import tools.jackson.databind.ObjectMapper;

@IntegrationTest
class StitchApiTests {

  private static final String VALID =
      """
      {"name":"Bobble","abbreviation":"bo","lines":[[0.1,0.2,0.9,0.8]],"circles":[[0.5,0.5,0.25]]}\
      """;

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;
  @Autowired private ObjectMapper objectMapper;

  private ResultActions send(MockHttpServletRequestBuilder request, Cookie session, String body)
      throws Exception {
    return mockMvc.perform(
        request.cookie(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body));
  }

  private String created(Cookie session) throws Exception {
    return objectMapper
        .readTree(
            send(post("/api/stitches"), session, VALID)
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString())
        .get("id")
        .asString();
  }

  @Test
  void aCreatedStitchIsListed() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    created(session);

    mockMvc
        .perform(get("/api/stitches").cookie(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].name").value("Bobble"))
        .andExpect(jsonPath("$[0].abbreviation").value("bo"))
        .andExpect(jsonPath("$[0].lines[0][2]").value(0.9))
        .andExpect(jsonPath("$[0].circles[0][2]").value(0.25));
  }

  @Test
  void aStitchCanBeChanged() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = created(session);

    send(put("/api/stitches/" + id), session, VALID.replace("Bobble", "Popcorn"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Popcorn"));
  }

  @Test
  void aStitchCanBeDeleted() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = created(session);

    mockMvc
        .perform(delete("/api/stitches/" + id).cookie(session).with(csrf()))
        .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/stitches").cookie(session)).andExpect(jsonPath("$", hasSize(0)));
  }

  @Test
  void stitchesOfOthersStayHidden() throws Exception {
    String id = created(signUp(mockMvc, uniqueName()));
    Cookie stranger = signUp(mockMvc, uniqueName());

    mockMvc.perform(get("/api/stitches").cookie(stranger)).andExpect(jsonPath("$", hasSize(0)));
    send(put("/api/stitches/" + id), stranger, VALID).andExpect(status().isNotFound());
    mockMvc
        .perform(delete("/api/stitches/" + id).cookie(stranger).with(csrf()))
        .andExpect(status().isNotFound());
  }

  @Test
  void invalidStitchesAreRejected() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String tooManyLines = "[" + String.join(",", Collections.nCopies(65, "[0,0,1,1]")) + "]";

    String[] invalid = {
      VALID.replace("Bobble", " "),
      VALID.replace("Bobble", "x".repeat(61)),
      VALID.replace("\"bo\"", "\"\""),
      VALID.replace("\"bo\"", "\"" + "x".repeat(13) + "\""),
      VALID.replace("\"bo\"", "\"<b>\""),
      VALID.replace("[[0.1,0.2,0.9,0.8]]", "[[0.1,0.2,0.9]]"),
      VALID.replace("[[0.1,0.2,0.9,0.8]]", "[[0.1,0.2,0.9,1.5]]"),
      VALID.replace("[[0.1,0.2,0.9,0.8]]", "[[-0.1,0.2,0.9,0.8]]"),
      VALID.replace("[[0.5,0.5,0.25]]", "[[0.5,0.5]]"),
      VALID.replace("[[0.5,0.5,0.25]]", "[[0.5,0.5,2]]"),
      VALID.replace("[[0.1,0.2,0.9,0.8]]", tooManyLines),
      VALID.replace("[[0.1,0.2,0.9,0.8]]", "[]").replace("[[0.5,0.5,0.25]]", "[]"),
    };

    for (String body : invalid) {
      send(post("/api/stitches"), session, body).andExpect(status().isBadRequest());
    }
  }

  @Test
  void deletingAnAccountDeletesItsStitches() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = created(session);

    send(delete("/api/account"), session, "{\"password\":\"%s\"}".formatted(PASSWORD))
        .andExpect(status().isNoContent());

    assertThat(
            jdbcTemplate.queryForObject(
                "select count(*) from custom_stitches where id = ?::uuid", Integer.class, id))
        .isZero();
  }

  @Test
  void stitchesNeedASession() throws Exception {
    mockMvc.perform(get("/api/stitches")).andExpect(status().isUnauthorized());
  }

  private static final String CHART =
      """
      {"title":"Rose","craftType":"crochet","width":2,"height":1,"palette":[],"cells":[0,0],
       "symbols":[1000,20],
       "customStitches":[{"id":1000,"name":"Bobble","abbreviation":"bo",
         "lines":[[0,0,1,1]],"circles":[]}]}\
      """;

  @Test
  void aChartKeepsTheCustomStitchesItUses() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());

    String id =
        objectMapper
            .readTree(
                send(post("/api/patterns"), session, CHART)
                    .andExpect(status().isCreated())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .get("id")
            .asString();

    mockMvc
        .perform(get("/api/patterns/" + id).cookie(session))
        .andExpect(jsonPath("$.customStitches[0].id").value(1000))
        .andExpect(jsonPath("$.customStitches[0].name").value("Bobble"))
        .andExpect(jsonPath("$.customStitches[0].lines[0][2]").value(1.0));
  }

  @Test
  void aChartMustNotReferToAnUnknownCustomStitch() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());

    send(post("/api/patterns"), session, CHART.replace("[1000,20]", "[1001,20]"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void anEmbeddedStitchIsValidatedLikeAnyOther() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());

    send(post("/api/patterns"), session, CHART.replace("[0,0,1,1]", "[0,0,1,7]"))
        .andExpect(status().isBadRequest());
    send(post("/api/patterns"), session, CHART.replace("\"id\":1000", "\"id\":5"))
        .andExpect(status().isBadRequest());
  }
}
