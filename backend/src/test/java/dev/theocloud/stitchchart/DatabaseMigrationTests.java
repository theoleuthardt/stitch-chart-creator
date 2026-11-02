package dev.theocloud.stitchchart;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class DatabaseMigrationTests {

  @Autowired private JdbcTemplate jdbcTemplate;

  @Test
  void liquibaseManagesTheSchema() {
    Boolean tracked =
        jdbcTemplate.queryForObject(
            "select to_regclass('public.databasechangelog') is not null", Boolean.class);

    assertThat(tracked).isTrue();
  }
}
