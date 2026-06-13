package com.connectit.core.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class SettingsController {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Helper methods to extract values safely ──
    private String getStr(Map<String, Object> body, String... keys) {
        for (String key : keys) {
            Object val = body.get(key);
            if (val != null) return val.toString();
        }
        return null;
    }

    private Long getLong(Map<String, Object> body, String... keys) {
        for (String key : keys) {
            Object val = body.get(key);
            if (val != null) {
                if (val instanceof Number) return ((Number) val).longValue();
                try {
                    return Long.parseLong(val.toString().trim());
                } catch (Exception ignored) {}
            }
        }
        return null;
    }

    private Integer getInt(Map<String, Object> body, String... keys) {
        for (String key : keys) {
            Object val = body.get(key);
            if (val != null) {
                if (val instanceof Number) return ((Number) val).intValue();
                try {
                    return Integer.parseInt(val.toString().trim());
                } catch (Exception ignored) {}
            }
        }
        return null;
    }

    private boolean getBool(Map<String, Object> body, String... keys) {
        for (String key : keys) {
            Object val = body.get(key);
            if (val != null) {
                if (val instanceof Boolean) return (Boolean) val;
                if (val instanceof Number) return ((Number) val).intValue() != 0;
                String s = val.toString().trim();
                return "true".equalsIgnoreCase(s) || "1".equals(s);
            }
        }
        return false;
    }

    private String getJsonOrStr(Map<String, Object> body, String... keys) {
        for (String key : keys) {
            Object val = body.get(key);
            if (val != null) {
                if (val instanceof Collection || val instanceof Map || val instanceof Object[]) {
                    try {
                        return objectMapper.writeValueAsString(val);
                    } catch (Exception ignored) {}
                }
                return val.toString();
            }
        }
        return null;
    }

    private String resolveCompanyId(String queryCompanyId, String headerCompanyId) {
        if (queryCompanyId != null && !queryCompanyId.isBlank()) {
            return queryCompanyId.trim();
        }
        if (headerCompanyId != null && !headerCompanyId.isBlank()) {
            return headerCompanyId.trim();
        }
        return null;
    }

    // ── Mappers to return both snake_case and camelCase ──
    private Map<String, Object> mapCategory(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>();
        String id = String.valueOf(row.get("id"));
        m.put("id", id);
        m.put("name", row.get("name"));
        m.put("description", row.get("description"));
        m.put("status", row.get("status"));
        m.put("created_at", row.get("created_at"));
        m.put("createdAt", row.get("created_at"));
        m.put("created_by", row.get("created_by"));
        m.put("createdBy", row.get("created_by"));
        m.put("company_id", row.get("company_id"));
        m.put("companyId", row.get("company_id"));
        return m;
    }

    private Map<String, Object> mapSubcategory(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>();
        String id = String.valueOf(row.get("id"));
        m.put("id", id);
        m.put("name", row.get("name"));
        m.put("description", row.get("description"));
        m.put("category_id", row.get("category_id"));
        m.put("categoryId", row.get("category_id"));
        m.put("status", row.get("status"));
        m.put("created_at", row.get("created_at"));
        m.put("createdAt", row.get("created_at"));
        m.put("created_by", row.get("created_by"));
        m.put("createdBy", row.get("created_by"));
        m.put("company_id", row.get("company_id"));
        m.put("companyId", row.get("company_id"));
        return m;
    }

    private Map<String, Object> mapServiceProvider(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>();
        String id = String.valueOf(row.get("id"));
        m.put("id", id);
        m.put("name", row.get("name"));
        m.put("description", row.get("description"));
        m.put("category_id", row.get("category_id"));
        m.put("categoryId", row.get("category_id"));
        m.put("subcategory_id", row.get("subcategory_id"));
        m.put("subcategoryId", row.get("subcategory_id"));
        m.put("sla", row.get("sla"));
        m.put("status", row.get("status"));
        m.put("created_at", row.get("created_at"));
        m.put("createdAt", row.get("created_at"));
        m.put("created_by", row.get("created_by"));
        m.put("createdBy", row.get("created_by"));
        m.put("company_id", row.get("company_id"));
        m.put("companyId", row.get("company_id"));
        return m;
    }

    private Map<String, Object> mapGroupMember(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>();
        String id = String.valueOf(row.get("id"));
        m.put("id", id);
        m.put("user_id", row.get("user_id"));
        m.put("userId", row.get("user_id"));
        m.put("user_name", row.get("user_name"));
        m.put("userName", row.get("user_name"));
        m.put("user_email", row.get("user_email"));
        m.put("userEmail", row.get("user_email"));
        m.put("group_id", row.get("group_id"));
        m.put("groupId", row.get("group_id"));
        m.put("role_in_group", row.get("role_in_group"));
        m.put("roleInGroup", row.get("role_in_group"));
        m.put("is_primary", row.get("is_primary"));
        m.put("isPrimary", getBool(row, "is_primary"));
        m.put("availability_status", row.get("availability_status"));
        m.put("availabilityStatus", row.get("availability_status"));
        m.put("current_workload", row.get("current_workload"));
        m.put("currentWorkload", row.get("current_workload"));
        
        Object skillsVal = row.get("skills");
        if (skillsVal != null) {
            String skillsStr = skillsVal.toString();
            if (skillsStr.trim().startsWith("[")) {
                try {
                    m.put("skills", objectMapper.readValue(skillsStr, List.class));
                } catch (Exception e) {
                    m.put("skills", List.of(skillsStr.split(",")));
                }
            } else {
                m.put("skills", List.of(skillsStr.split(",")));
            }
        } else {
            m.put("skills", List.of());
        }
        
        m.put("status", row.get("status"));
        m.put("created_at", row.get("created_at"));
        m.put("createdAt", row.get("created_at"));
        m.put("created_by", row.get("created_by"));
        m.put("createdBy", row.get("created_by"));
        m.put("company_id", row.get("company_id"));
        m.put("companyId", row.get("company_id"));
        return m;
    }

    private Map<String, Object> mapGroup(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>();
        String id = String.valueOf(row.get("id"));
        m.put("id", id);
        m.put("name", row.get("name"));
        m.put("description", row.get("description"));
        m.put("manager_uid", row.get("manager_uid"));
        m.put("managerUid", row.get("manager_uid"));
        m.put("managerId", row.get("manager_uid"));
        m.put("manager_name", row.get("manager_name"));
        m.put("managerName", row.get("manager_name"));
        m.put("assignment_email", row.get("assignment_email"));
        m.put("assignmentEmail", row.get("assignment_email"));
        m.put("emailAlias", row.get("assignment_email"));
        
        boolean isActive = getBool(row, "is_active");
        m.put("is_active", isActive);
        m.put("isActive", isActive);
        m.put("status", isActive ? "active" : "inactive");
        
        m.put("created_at", row.get("created_at"));
        m.put("createdAt", row.get("created_at"));
        m.put("updated_at", row.get("updated_at"));
        m.put("updatedAt", row.get("updated_at"));
        m.put("company_id", row.get("company_id"));
        m.put("companyId", row.get("company_id"));
        return m;
    }

    // ── GET Branding Settings ────────────────────────────────────────────────
    @GetMapping("/settings/branding")
    public ResponseEntity<?> getBranding() {
        log.info("[Branding] Fetching branding settings");
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT setting_value FROM system_settings WHERE setting_key = 'branding'"
            );
            if (!rows.isEmpty()) {
                String settingVal = (String) rows.get(0).get("setting_value");
                if (settingVal != null && !settingVal.isBlank()) {
                    try {
                        Map<?, ?> parsed = objectMapper.readValue(settingVal, Map.class);
                        return ResponseEntity.ok(parsed);
                    } catch (Exception e) {
                        log.warn("[Branding] Failed to parse branding JSON, using fallback", e);
                    }
                }
            }
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("companyName", "Connect");
            fallback.put("logoBase64", null);
            fallback.put("logoType", null);
            return ResponseEntity.ok(fallback);
        } catch (Exception e) {
            log.error("[Branding] Error fetching branding settings: {}", e.getMessage(), e);
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("companyName", "Connect");
            fallback.put("logoBase64", null);
            fallback.put("logoType", null);
            return ResponseEntity.ok(fallback);
        }
    }

    // ── POST Branding Settings ───────────────────────────────────────────────
    @PostMapping("/settings/branding")
    @Transactional
    public ResponseEntity<?> postBranding(@RequestBody Map<String, Object> body) {
        log.info("[Branding] Updating branding settings with body: {}", body);
        try {
            String companyName = (String) body.getOrDefault("companyName", "Connect");
            String logoBase64 = (String) body.get("logoBase64");
            String logoType = (String) body.get("logoType");
            String updatedBy = (String) body.getOrDefault("updatedBy", "System");

            Map<String, Object> brandingMap = new HashMap<>();
            brandingMap.put("companyName", companyName);
            brandingMap.put("logoBase64", logoBase64);
            brandingMap.put("logoType", logoType);
            String brandingJson = objectMapper.writeValueAsString(brandingMap);

            List<Map<String, Object>> existing = jdbcTemplate.queryForList(
                "SELECT id FROM system_settings WHERE setting_key = 'branding'"
            );

            if (!existing.isEmpty()) {
                jdbcTemplate.update(
                    "UPDATE system_settings SET setting_value = ?, updated_by = ? WHERE setting_key = 'branding'",
                    brandingJson, updatedBy
                );
            } else {
                jdbcTemplate.update(
                    "INSERT INTO system_settings (setting_key, setting_value, setting_type, description, updated_by) VALUES (?, ?, ?, ?, ?)",
                    "branding", brandingJson, "json", "Branding logo and company name", updatedBy
                );
            }

            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("[Branding] Error saving branding: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // ── 1. SETTINGS CATEGORIES ────────────────────────────────────────────────
    @GetMapping("/settings_categories")
    public ResponseEntity<?> getCategories(
            @RequestParam(value = "company_id", required = false) String queryCompanyId,
            @RequestHeader(value = "x-company-id", required = false) String headerCompanyId) {
        String companyId = resolveCompanyId(queryCompanyId, headerCompanyId);
        log.info("[Categories] Fetching categories with companyId: {}", companyId);
        try {
            List<Map<String, Object>> rows;
            if (companyId != null) {
                rows = jdbcTemplate.queryForList(
                    "SELECT * FROM settings_categories WHERE company_id = ? OR company_id IS NULL ORDER BY name ASC",
                    companyId
                );
            } else {
                rows = jdbcTemplate.queryForList("SELECT * FROM settings_categories ORDER BY name ASC");
            }
            return ResponseEntity.ok(rows.stream().map(this::mapCategory).toList());
        } catch (Exception e) {
            log.error("[Categories] Failed to fetch categories: {}", e.getMessage(), e);
            return ResponseEntity.ok(List.of());
        }
    }

    @PostMapping("/settings_categories")
    @Transactional
    public ResponseEntity<?> createCategory(@RequestBody Map<String, Object> body) {
        log.info("[Categories] Creating category: {}", body);
        try {
            String id = getStr(body, "id");
            if (id == null) {
                id = "cat_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
            }
            String name = getStr(body, "name");
            String description = getStr(body, "description");
            String status = getStr(body, "status");
            if (status == null) status = "active";
            String createdBy = getStr(body, "created_by", "createdBy");
            Long companyId = getLong(body, "company_id", "companyId");

            jdbcTemplate.update(
                "INSERT INTO settings_categories (id, name, description, status, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?)",
                id, name, description, status, createdBy, companyId
            );

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM settings_categories WHERE id = ?", id);
            return ResponseEntity.ok(mapCategory(rows.get(0)));
        } catch (Exception e) {
            log.error("[Categories] Failed to create category: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PutMapping("/settings_categories/{id}")
    @Transactional
    public ResponseEntity<?> updateCategory(@PathVariable String id, @RequestBody Map<String, Object> body) {
        log.info("[Categories] Updating category {} with body: {}", id, body);
        try {
            String name = getStr(body, "name");
            String description = getStr(body, "description");
            String status = getStr(body, "status");
            Long companyId = getLong(body, "company_id", "companyId");

            jdbcTemplate.update(
                "UPDATE settings_categories SET name = ?, description = ?, status = ?, company_id = ? WHERE id = ?",
                name, description, status, companyId, id
            );

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM settings_categories WHERE id = ?", id);
            if (rows.isEmpty()) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(mapCategory(rows.get(0)));
        } catch (Exception e) {
            log.error("[Categories] Failed to update category: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @DeleteMapping("/settings_categories/{id}")
    @Transactional
    public ResponseEntity<?> deleteCategory(@PathVariable String id) {
        log.info("[Categories] Deleting category {}", id);
        try {
            jdbcTemplate.update("DELETE FROM settings_categories WHERE id = ?", id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("[Categories] Failed to delete category: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // ── 2. SETTINGS SUBCATEGORIES ─────────────────────────────────────────────
    @GetMapping("/settings_subcategories")
    public ResponseEntity<?> getSubcategories(
            @RequestParam(value = "company_id", required = false) String queryCompanyId,
            @RequestHeader(value = "x-company-id", required = false) String headerCompanyId) {
        String companyId = resolveCompanyId(queryCompanyId, headerCompanyId);
        log.info("[Subcategories] Fetching subcategories with companyId: {}", companyId);
        try {
            List<Map<String, Object>> rows;
            if (companyId != null) {
                rows = jdbcTemplate.queryForList(
                    "SELECT * FROM settings_subcategories WHERE company_id = ? OR company_id IS NULL ORDER BY name ASC",
                    companyId
                );
            } else {
                rows = jdbcTemplate.queryForList("SELECT * FROM settings_subcategories ORDER BY name ASC");
            }
            return ResponseEntity.ok(rows.stream().map(this::mapSubcategory).toList());
        } catch (Exception e) {
            log.error("[Subcategories] Failed to fetch subcategories: {}", e.getMessage(), e);
            return ResponseEntity.ok(List.of());
        }
    }

    @PostMapping("/settings_subcategories")
    @Transactional
    public ResponseEntity<?> createSubcategory(@RequestBody Map<String, Object> body) {
        log.info("[Subcategories] Creating subcategory: {}", body);
        try {
            String id = getStr(body, "id");
            if (id == null) {
                id = "sub_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
            }
            String name = getStr(body, "name");
            String description = getStr(body, "description");
            String categoryId = getStr(body, "category_id", "categoryId");
            String status = getStr(body, "status");
            if (status == null) status = "active";
            String createdBy = getStr(body, "created_by", "createdBy");
            Long companyId = getLong(body, "company_id", "companyId");

            jdbcTemplate.update(
                "INSERT INTO settings_subcategories (id, name, description, category_id, status, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                id, name, description, categoryId, status, createdBy, companyId
            );

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM settings_subcategories WHERE id = ?", id);
            return ResponseEntity.ok(mapSubcategory(rows.get(0)));
        } catch (Exception e) {
            log.error("[Subcategories] Failed to create subcategory: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PutMapping("/settings_subcategories/{id}")
    @Transactional
    public ResponseEntity<?> updateSubcategory(@PathVariable String id, @RequestBody Map<String, Object> body) {
        log.info("[Subcategories] Updating subcategory {} with body: {}", id, body);
        try {
            String name = getStr(body, "name");
            String description = getStr(body, "description");
            String categoryId = getStr(body, "category_id", "categoryId");
            String status = getStr(body, "status");
            Long companyId = getLong(body, "company_id", "companyId");

            jdbcTemplate.update(
                "UPDATE settings_subcategories SET name = ?, description = ?, category_id = ?, status = ?, company_id = ? WHERE id = ?",
                name, description, categoryId, status, companyId, id
            );

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM settings_subcategories WHERE id = ?", id);
            if (rows.isEmpty()) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(mapSubcategory(rows.get(0)));
        } catch (Exception e) {
            log.error("[Subcategories] Failed to update subcategory: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @DeleteMapping("/settings_subcategories/{id}")
    @Transactional
    public ResponseEntity<?> deleteSubcategory(@PathVariable String id) {
        log.info("[Subcategories] Deleting subcategory {}", id);
        try {
            jdbcTemplate.update("DELETE FROM settings_subcategories WHERE id = ?", id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("[Subcategories] Failed to delete subcategory: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // ── 3. SETTINGS SERVICE PROVIDERS ─────────────────────────────────────────
    @GetMapping("/settings_service_providers")
    public ResponseEntity<?> getServiceProviders(
            @RequestParam(value = "company_id", required = false) String queryCompanyId,
            @RequestHeader(value = "x-company-id", required = false) String headerCompanyId) {
        String companyId = resolveCompanyId(queryCompanyId, headerCompanyId);
        log.info("[ServiceProviders] Fetching service providers with companyId: {}", companyId);
        try {
            List<Map<String, Object>> rows;
            if (companyId != null) {
                rows = jdbcTemplate.queryForList(
                    "SELECT * FROM settings_service_providers WHERE company_id = ? OR company_id IS NULL ORDER BY name ASC",
                    companyId
                );
            } else {
                rows = jdbcTemplate.queryForList("SELECT * FROM settings_service_providers ORDER BY name ASC");
            }
            return ResponseEntity.ok(rows.stream().map(this::mapServiceProvider).toList());
        } catch (Exception e) {
            log.error("[ServiceProviders] Failed to fetch service providers: {}", e.getMessage(), e);
            return ResponseEntity.ok(List.of());
        }
    }

    @PostMapping("/settings_service_providers")
    @Transactional
    public ResponseEntity<?> createServiceProvider(@RequestBody Map<String, Object> body) {
        log.info("[ServiceProviders] Creating service provider: {}", body);
        try {
            String id = getStr(body, "id");
            if (id == null) {
                id = "prov_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
            }
            String name = getStr(body, "name");
            String description = getStr(body, "description");
            String categoryId = getStr(body, "category_id", "categoryId");
            String subcategoryId = getStr(body, "subcategory_id", "subcategoryId");
            String sla = getStr(body, "sla");
            String status = getStr(body, "status");
            if (status == null) status = "active";
            String createdBy = getStr(body, "created_by", "createdBy");
            Long companyId = getLong(body, "company_id", "companyId");

            jdbcTemplate.update(
                "INSERT INTO settings_service_providers (id, name, description, category_id, subcategory_id, sla, status, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id, name, description, categoryId, subcategoryId, sla, status, createdBy, companyId
            );

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM settings_service_providers WHERE id = ?", id);
            return ResponseEntity.ok(mapServiceProvider(rows.get(0)));
        } catch (Exception e) {
            log.error("[ServiceProviders] Failed to create service provider: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PutMapping("/settings_service_providers/{id}")
    @Transactional
    public ResponseEntity<?> updateServiceProvider(@PathVariable String id, @RequestBody Map<String, Object> body) {
        log.info("[ServiceProviders] Updating service provider {} with body: {}", id, body);
        try {
            String name = getStr(body, "name");
            String description = getStr(body, "description");
            String categoryId = getStr(body, "category_id", "categoryId");
            String subcategoryId = getStr(body, "subcategory_id", "subcategoryId");
            String sla = getStr(body, "sla");
            String status = getStr(body, "status");
            Long companyId = getLong(body, "company_id", "companyId");

            jdbcTemplate.update(
                "UPDATE settings_service_providers SET name = ?, description = ?, category_id = ?, subcategory_id = ?, sla = ?, status = ?, company_id = ? WHERE id = ?",
                name, description, categoryId, subcategoryId, sla, status, companyId, id
            );

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM settings_service_providers WHERE id = ?", id);
            if (rows.isEmpty()) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(mapServiceProvider(rows.get(0)));
        } catch (Exception e) {
            log.error("[ServiceProviders] Failed to update service provider: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @DeleteMapping("/settings_service_providers/{id}")
    @Transactional
    public ResponseEntity<?> deleteServiceProvider(@PathVariable String id) {
        log.info("[ServiceProviders] Deleting service provider {}", id);
        try {
            jdbcTemplate.update("DELETE FROM settings_service_providers WHERE id = ?", id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("[ServiceProviders] Failed to delete service provider: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // ── 4. SETTINGS GROUP MEMBERS ─────────────────────────────────────────────
    @GetMapping("/settings_group_members")
    public ResponseEntity<?> getGroupMembers(
            @RequestParam(value = "company_id", required = false) String queryCompanyId,
            @RequestHeader(value = "x-company-id", required = false) String headerCompanyId) {
        String companyId = resolveCompanyId(queryCompanyId, headerCompanyId);
        log.info("[GroupMembers] Fetching group members with companyId: {}", companyId);
        try {
            List<Map<String, Object>> rows;
            if (companyId != null) {
                rows = jdbcTemplate.queryForList(
                    "SELECT * FROM settings_group_members WHERE company_id = ? OR company_id IS NULL ORDER BY user_name ASC",
                    companyId
                );
            } else {
                rows = jdbcTemplate.queryForList("SELECT * FROM settings_group_members ORDER BY user_name ASC");
            }
            return ResponseEntity.ok(rows.stream().map(this::mapGroupMember).toList());
        } catch (Exception e) {
            log.error("[GroupMembers] Failed to fetch group members: {}", e.getMessage(), e);
            return ResponseEntity.ok(List.of());
        }
    }

    @PostMapping("/settings_group_members")
    @Transactional
    public ResponseEntity<?> createGroupMember(@RequestBody Map<String, Object> body) {
        log.info("[GroupMembers] Creating group member: {}", body);
        try {
            String id = getStr(body, "id");
            if (id == null) {
                id = "mem_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
            }
            String userId = getStr(body, "user_id", "userId");
            String userName = getStr(body, "user_name", "userName");
            String userEmail = getStr(body, "user_email", "userEmail");
            String groupId = getStr(body, "group_id", "groupId");
            String roleInGroup = getStr(body, "role_in_group", "roleInGroup");
            boolean isPrimary = getBool(body, "is_primary", "isPrimary");
            String availabilityStatus = getStr(body, "availability_status", "availabilityStatus");
            if (availabilityStatus == null) availabilityStatus = "available";
            Integer currentWorkload = getInt(body, "current_workload", "currentWorkload");
            if (currentWorkload == null) currentWorkload = 0;
            String skills = getJsonOrStr(body, "skills");
            String status = getStr(body, "status");
            if (status == null) status = "active";
            String createdBy = getStr(body, "created_by", "createdBy");
            Long companyId = getLong(body, "company_id", "companyId");

            jdbcTemplate.update(
                "INSERT INTO settings_group_members (id, user_id, user_name, user_email, group_id, role_in_group, is_primary, availability_status, current_workload, skills, status, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id, userId, userName, userEmail, groupId, roleInGroup, isPrimary ? 1 : 0, availabilityStatus, currentWorkload, skills, status, createdBy, companyId
            );

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM settings_group_members WHERE id = ?", id);
            return ResponseEntity.ok(mapGroupMember(rows.get(0)));
        } catch (Exception e) {
            log.error("[GroupMembers] Failed to create group member: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PutMapping("/settings_group_members/{id}")
    @Transactional
    public ResponseEntity<?> updateGroupMember(@PathVariable String id, @RequestBody Map<String, Object> body) {
        log.info("[GroupMembers] Updating group member {} with body: {}", id, body);
        try {
            String userId = getStr(body, "user_id", "userId");
            String userName = getStr(body, "user_name", "userName");
            String userEmail = getStr(body, "user_email", "userEmail");
            String groupId = getStr(body, "group_id", "groupId");
            String roleInGroup = getStr(body, "role_in_group", "roleInGroup");
            boolean isPrimary = getBool(body, "is_primary", "isPrimary");
            String availabilityStatus = getStr(body, "availability_status", "availabilityStatus");
            Integer currentWorkload = getInt(body, "current_workload", "currentWorkload");
            String skills = getJsonOrStr(body, "skills");
            String status = getStr(body, "status");
            Long companyId = getLong(body, "company_id", "companyId");

            jdbcTemplate.update(
                "UPDATE settings_group_members SET user_id = ?, user_name = ?, user_email = ?, group_id = ?, role_in_group = ?, is_primary = ?, availability_status = ?, current_workload = ?, skills = ?, status = ?, company_id = ? WHERE id = ?",
                userId, userName, userEmail, groupId, roleInGroup, isPrimary ? 1 : 0, availabilityStatus, currentWorkload, skills, status, companyId, id
            );

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM settings_group_members WHERE id = ?", id);
            if (rows.isEmpty()) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(mapGroupMember(rows.get(0)));
        } catch (Exception e) {
            log.error("[GroupMembers] Failed to update group member: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @DeleteMapping("/settings_group_members/{id}")
    @Transactional
    public ResponseEntity<?> deleteGroupMember(@PathVariable String id) {
        log.info("[GroupMembers] Deleting group member {}", id);
        try {
            jdbcTemplate.update("DELETE FROM settings_group_members WHERE id = ?", id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("[GroupMembers] Failed to delete group member: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // ── 5. SETTINGS GROUPS ────────────────────────────────────────────────────
    @GetMapping("/settings_groups")
    public ResponseEntity<?> getGroups(
            @RequestParam(value = "company_id", required = false) String queryCompanyId,
            @RequestHeader(value = "x-company-id", required = false) String headerCompanyId) {
        String companyId = resolveCompanyId(queryCompanyId, headerCompanyId);
        log.info("[Groups] Fetching groups with companyId: {}", companyId);
        try {
            List<Map<String, Object>> rows;
            if (companyId != null) {
                rows = jdbcTemplate.queryForList(
                    "SELECT * FROM settings_groups WHERE company_id = ? OR company_id IS NULL ORDER BY name ASC",
                    companyId
                );
            } else {
                rows = jdbcTemplate.queryForList("SELECT * FROM settings_groups ORDER BY name ASC");
            }
            return ResponseEntity.ok(rows.stream().map(this::mapGroup).toList());
        } catch (Exception e) {
            log.error("[Groups] Failed to fetch groups: {}", e.getMessage(), e);
            return ResponseEntity.ok(List.of());
        }
    }

    @PostMapping("/settings_groups")
    @Transactional
    public ResponseEntity<?> createGroup(@RequestBody Map<String, Object> body) {
        log.info("[Groups] Creating group: {}", body);
        try {
            String id = getStr(body, "id");
            if (id == null) {
                id = "sg_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
            }
            String name = getStr(body, "name");
            String description = getStr(body, "description");
            String managerUid = getStr(body, "manager_uid", "managerUid", "managerId");
            String managerName = getStr(body, "manager_name", "managerName");
            String assignmentEmail = getStr(body, "assignment_email", "assignmentEmail", "emailAlias");
            boolean isActive = getBool(body, "is_active", "isActive");
            String status = getStr(body, "status");
            if (status != null) {
                isActive = "active".equalsIgnoreCase(status);
            }
            Long companyId = getLong(body, "company_id", "companyId");

            jdbcTemplate.update(
                "INSERT INTO settings_groups (id, name, description, manager_uid, manager_name, assignment_email, is_active, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                id, name, description, managerUid, managerName, assignmentEmail, isActive ? 1 : 0, companyId
            );

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM settings_groups WHERE id = ?", id);
            return ResponseEntity.ok(mapGroup(rows.get(0)));
        } catch (Exception e) {
            log.error("[Groups] Failed to create group: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PutMapping("/settings_groups/{id}")
    @Transactional
    public ResponseEntity<?> updateGroup(@PathVariable String id, @RequestBody Map<String, Object> body) {
        log.info("[Groups] Updating group {} with body: {}", id, body);
        try {
            String name = getStr(body, "name");
            String description = getStr(body, "description");
            String managerUid = getStr(body, "manager_uid", "managerUid", "managerId");
            String managerName = getStr(body, "manager_name", "managerName");
            String assignmentEmail = getStr(body, "assignment_email", "assignmentEmail", "emailAlias");
            boolean isActive = getBool(body, "is_active", "isActive");
            String status = getStr(body, "status");
            if (status != null) {
                isActive = "active".equalsIgnoreCase(status);
            }
            Long companyId = getLong(body, "company_id", "companyId");

            jdbcTemplate.update(
                "UPDATE settings_groups SET name = ?, description = ?, manager_uid = ?, manager_name = ?, assignment_email = ?, is_active = ?, company_id = ? WHERE id = ?",
                name, description, managerUid, managerName, assignmentEmail, isActive ? 1 : 0, companyId, id
            );

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM settings_groups WHERE id = ?", id);
            if (rows.isEmpty()) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(mapGroup(rows.get(0)));
        } catch (Exception e) {
            log.error("[Groups] Failed to update group: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @DeleteMapping("/settings_groups/{id}")
    @Transactional
    public ResponseEntity<?> deleteGroup(@PathVariable String id) {
        log.info("[Groups] Deleting group {}", id);
        try {
            jdbcTemplate.update("DELETE FROM settings_groups WHERE id = ?", id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("[Groups] Failed to delete group: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }
}
