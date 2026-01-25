#!/usr/bin/env python3
"""
游戏数据 API 测试脚本
"""
import requests
import json
import sys
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_section(title):
    """打印章节标题"""
    print(f"\n{'='*60}")
    print(f"{title}")
    print('='*60)

def test_register_and_login():
    """注册并登录用户"""
    print_section("1️⃣ 用户注册和登录")
    
    timestamp = int(time.time())
    username = f"testuser_{timestamp}"
    email = f"test_{timestamp}@example.com"
    password = "test123"
    
    try:
        # 注册
        print(f"\n📌 注册用户: {username}")
        register_data = {
            "username": username,
            "email": email,
            "password": password
        }
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=register_data,
            timeout=5
        )
        print(f"   状态码: {register_response.status_code}")
        if register_response.status_code == 201:
            print("   ✅ 注册成功")
            user_data = register_response.json()
            print(f"   用户 ID: {user_data.get('id')}")
        else:
            print(f"   ❌ 注册失败: {register_response.text}")
            return None, None
        
        # 登录
        print(f"\n📌 用户登录")
        login_data = {
            "username": username,
            "password": password
        }
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=login_data,
            timeout=5
        )
        print(f"   状态码: {login_response.status_code}")
        if login_response.status_code == 200:
            login_result = login_response.json()
            token = login_result.get('access_token')
            print(f"   ✅ 登录成功")
            print(f"   Token: {token[:50]}...")
            return username, token
        else:
            print(f"   ❌ 登录失败: {login_response.text}")
            return None, None
            
    except Exception as e:
        print(f"   ❌ 错误: {e}")
        return None, None

def test_get_statistics(token):
    """测试获取统计数据"""
    print_section("2️⃣ 获取用户统计数据")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{BASE_URL}/api/game/statistics",
            headers=headers,
            timeout=5
        )
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            stats = response.json()
            print(json.dumps(stats, indent=2, ensure_ascii=False))
            print("✅ 获取统计数据成功")
            return True
        else:
            print(f"❌ 失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

def test_get_sessions(token):
    """测试获取会话列表"""
    print_section("3️⃣ 获取游戏会话列表")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{BASE_URL}/api/game/sessions",
            headers=headers,
            timeout=5
        )
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            sessions = data.get('sessions', [])
            print(f"✅ 获取会话列表成功")
            print(f"   会话数量: {len(sessions)}")
            if sessions:
                print(f"\n   第一个会话:")
                print(json.dumps(sessions[0], indent=4, ensure_ascii=False, default=str))
            return True, sessions
        else:
            print(f"❌ 失败: {response.text}")
            return False, []
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False, []

def test_get_session_detail(token, session_id):
    """测试获取会话详情"""
    if not session_id:
        print_section("4️⃣ 获取会话详情（跳过：无会话）")
        return False
    
    print_section(f"4️⃣ 获取会话详情: {session_id}")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{BASE_URL}/api/game/sessions/{session_id}",
            headers=headers,
            timeout=5
        )
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            session = response.json()
            print(f"✅ 获取会话详情成功")
            print(f"   会话 ID: {session.get('id')}")
            print(f"   手数: {session.get('total_hands')}")
            print(f"   盈利: {session.get('total_profit')}")
            print(f"   胜率: {session.get('win_rate')}%")
            print(f"   回合数: {len(session.get('rounds', []))}")
            return True
        elif response.status_code == 404:
            print("ℹ️  会话不存在（这是正常的，如果还没有游戏数据）")
            return True
        else:
            print(f"❌ 失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

def test_api_documentation():
    """测试 API 文档是否可访问"""
    print_section("5️⃣ API 文档")
    
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            print("✅ API 文档可访问: http://localhost:8000/docs")
            return True
        else:
            print("⚠️  API 文档不可访问")
            return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

def main():
    print_section("Phase 2 游戏数据 API 测试")
    print("确保服务器正在运行: python3 run_server.py")
    print("等待 2 秒后开始测试...")
    time.sleep(2)
    
    # 测试健康检查
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            print("\n❌ 服务器未运行或无法访问")
            print("请先启动服务器: python3 run_server.py")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ 无法连接到服务器: {e}")
        print("请先启动服务器: python3 run_server.py")
        sys.exit(1)
    
    # 注册并登录
    username, token = test_register_and_login()
    if not token:
        print("\n❌ 认证失败，停止测试")
        sys.exit(1)
    
    # 测试 API 文档
    test_api_documentation()
    
    # 测试统计数据
    test_get_statistics(token)
    
    # 测试会话列表
    success, sessions = test_get_sessions(token)
    
    # 测试会话详情（如果有会话）
    session_id = sessions[0].get('id') if sessions else None
    test_get_session_detail(token, session_id)
    
    # 总结
    print_section("测试总结")
    print("✅ 所有 API 端点测试完成")
    print("\n📝 说明:")
    print("  - 如果会话列表为空，这是正常的（还没有游戏数据）")
    print("  - 要创建会话和回合数据，需要通过游戏流程")
    print("  - 或者可以手动创建测试数据来验证 API")
    print("\n🌐 API 文档: http://localhost:8000/docs")

if __name__ == "__main__":
    main()


