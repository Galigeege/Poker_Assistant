#!/usr/bin/env python3
"""
API 测试脚本
"""
import requests
import json
import sys
import time

BASE_URL = "http://localhost:8000"

def print_section(title):
    """打印章节标题"""
    print(f"\n{'='*50}")
    print(f"{title}")
    print('='*50)

def test_health():
    """测试健康检查"""
    print_section("1️⃣ 健康检查")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        assert response.status_code == 200
        print("✅ 健康检查通过")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到服务器，请确保服务器正在运行")
        print("   启动命令: python3 run_server.py")
        return False
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

def test_register():
    """测试用户注册"""
    print_section("2️⃣ 用户注册")
    try:
        # 使用时间戳确保用户名唯一
        timestamp = int(time.time())
        data = {
            "username": f"testuser_{timestamp}",
            "email": f"test_{timestamp}@example.com",
            "password": "test123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=data, timeout=5)
        result = response.json()
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if response.status_code == 201:
            print("✅ 用户注册成功")
            return data["username"], data["password"]
        else:
            print(f"❌ 注册失败: {result.get('detail', 'Unknown error')}")
            return None, None
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return None, None

def test_login(username, password):
    """测试用户登录"""
    print_section("3️⃣ 用户登录")
    try:
        data = {"username": username, "password": password}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=data, timeout=5)
        result = response.json()
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if response.status_code == 200 and "access_token" in result:
            print("✅ 登录成功")
            print(f"   Token: {result['access_token'][:50]}...")
            return result["access_token"]
        else:
            print(f"❌ 登录失败: {result.get('detail', 'Unknown error')}")
            return None
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return None

def test_get_me(token):
    """测试获取用户信息"""
    print_section("4️⃣ 获取用户信息（Token 验证）")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers, timeout=5)
        result = response.json()
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if response.status_code == 200 and "username" in result:
            print("✅ Token 验证成功")
            return True
        else:
            print(f"❌ 验证失败: {result.get('detail', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

def test_error_cases():
    """测试错误场景"""
    print_section("5️⃣ 错误场景测试")
    
    # 测试重复注册
    print("\n📌 测试重复注册...")
    try:
        data = {
            "username": "duplicate_test",
            "email": "duplicate@test.com",
            "password": "test123"
        }
        # 第一次注册
        response1 = requests.post(f"{BASE_URL}/api/auth/register", json=data, timeout=5)
        if response1.status_code == 201:
            print("   ✅ 第一次注册成功")
        # 第二次注册（应该失败）
        response2 = requests.post(f"{BASE_URL}/api/auth/register", json=data, timeout=5)
        if response2.status_code == 400:
            print("   ✅ 重复注册正确返回错误")
        else:
            print(f"   ⚠️  重复注册未正确处理: {response2.status_code}")
    except Exception as e:
        print(f"   ❌ 测试失败: {e}")
    
    # 测试错误密码
    print("\n📌 测试错误密码...")
    try:
        data = {"username": "duplicate_test", "password": "wrongpassword"}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=data, timeout=5)
        if response.status_code == 401:
            print("   ✅ 错误密码正确返回 401")
        else:
            print(f"   ⚠️  错误密码未正确处理: {response.status_code}")
    except Exception as e:
        print(f"   ❌ 测试失败: {e}")

def main():
    print_section("Phase 1 API 测试")
    print("确保服务器正在运行: python3 run_server.py")
    print("等待 3 秒后开始测试...")
    time.sleep(3)
    
    # 测试健康检查
    if not test_health():
        print("\n❌ 服务器未运行，请先启动服务器")
        sys.exit(1)
    
    # 测试注册
    username, password = test_register()
    if not username:
        print("\n❌ 注册测试失败，停止后续测试")
        sys.exit(1)
    
    # 测试登录
    token = test_login(username, password)
    if not token:
        print("\n❌ 登录测试失败，停止后续测试")
        sys.exit(1)
    
    # 测试获取用户信息
    if not test_get_me(token):
        print("\n❌ Token 验证测试失败")
        sys.exit(1)
    
    # 测试错误场景
    test_error_cases()
    
    # 总结
    print_section("测试总结")
    print("✅ 所有核心功能测试通过！")
    print("\n📝 测试完成，可以继续开发 Phase 1 的前端部分")

if __name__ == "__main__":
    main()


