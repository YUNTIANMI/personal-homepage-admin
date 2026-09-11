package com.luoji.blog.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.luoji.blog.dto.SiteConfigSaveDTO;
import com.luoji.blog.entity.SiteConfig;
import com.luoji.blog.mapper.SiteConfigMapper;
import com.luoji.blog.service.SiteConfigService;
import com.luoji.blog.vo.SiteConfigVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

/** 站点配置服务实现（单行表，id 恒为 1） */
@Service
@RequiredArgsConstructor
public class SiteConfigServiceImpl implements SiteConfigService {

    private static final Long CONFIG_ID = 1L;

    private final SiteConfigMapper configMapper;
    private final ObjectMapper objectMapper;

    @Override
    public SiteConfigVO get() {
        SiteConfig config = configMapper.selectById(CONFIG_ID);
        if (config == null) {
            return SiteConfigVO.builder().tech(List.of()).build();
        }
        return toVO(config);
    }

    @Override
    public void update(SiteConfigSaveDTO dto) {
        SiteConfig config = configMapper.selectById(CONFIG_ID);
        boolean isInsert = config == null;
        if (isInsert) {
            config = new SiteConfig();
            config.setId(CONFIG_ID);
        }

        config.setName(dto.getName().trim());
        config.setEn(dto.getEn().trim());
        config.setRole(dto.getRole().trim());
        config.setHeadline(dto.getHeadline().trim());
        config.setIntro(dto.getIntro().trim());
        config.setGithub(dto.getGithub() == null ? "" : dto.getGithub().trim());
        config.setEmail(dto.getEmail() == null ? "" : dto.getEmail().trim());
        config.setTech(toJson(dto.getTech() == null ? List.of() : dto.getTech()));
        config.setStartYear(dto.getStartYear());

        if (isInsert) {
            configMapper.insert(config);
        } else {
            configMapper.updateById(config);
        }
    }

    private SiteConfigVO toVO(SiteConfig config) {
        return SiteConfigVO.builder()
                .name(config.getName())
                .en(config.getEn())
                .role(config.getRole())
                .headline(config.getHeadline())
                .intro(config.getIntro())
                .github(config.getGithub())
                .email(config.getEmail())
                .tech(readJson(config.getTech()))
                .startYear(config.getStartYear())
                .build();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("JSON 序列化失败", e);
        }
    }

    private List<String> readJson(String json) {
        if (!StringUtils.hasText(json)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            throw new IllegalStateException("JSON 解析失败", e);
        }
    }
}
