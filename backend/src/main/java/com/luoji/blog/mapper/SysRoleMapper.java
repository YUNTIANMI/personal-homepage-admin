package com.luoji.blog.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.luoji.blog.entity.SysRole;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/** 角色 Mapper。 */
public interface SysRoleMapper extends BaseMapper<SysRole> {

    /** 查某个用户拥有的角色编码（多对多关联查询） */
    @Select("SELECT r.code FROM sys_role r "
            + "JOIN sys_user_role ur ON r.id = ur.role_id "
            + "WHERE ur.user_id = #{userId}")
    List<String> selectCodesByUserId(@Param("userId") Long userId);
}
