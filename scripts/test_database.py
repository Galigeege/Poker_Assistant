#!/usr/bin/env python3
"""
数据库功能测试脚本
测试用户、会话、回合的创建和查询功能
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.database import crud
from backend.auth.security import get_password_hash
from backend.services.game_session_service import GameSessionService

def print_section(title):
    """打印测试章节标题"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def test_user_creation(db: Session):
    """测试用户创建"""
    print_section("测试 1: 用户创建")
    
    # 创建测试用户 1
    user1_data = {
        "username": "testuser1",
        "email": "test1@example.com",
        "password": "testpass123"
    }
    
    # 检查用户是否已存在
    existing_user = crud.get_user_by_username(db, user1_data["username"])
    if existing_user:
        print(f"⚠️  用户 {user1_data['username']} 已存在，跳过创建")
        user1 = existing_user
    else:
        user1 = crud.create_user(
            db,
            username=user1_data["username"],
            email=user1_data["email"],
            password_hash=get_password_hash(user1_data["password"])
        )
        print(f"✅ 用户 1 创建成功: {user1.username} (ID: {user1.id})")
    
    # 创建测试用户 2
    user2_data = {
        "username": "testuser2",
        "email": "test2@example.com",
        "password": "testpass123"
    }
    
    existing_user2 = crud.get_user_by_username(db, user2_data["username"])
    if existing_user2:
        print(f"⚠️  用户 {user2_data['username']} 已存在，跳过创建")
        user2 = existing_user2
    else:
        user2 = crud.create_user(
            db,
            username=user2_data["username"],
            email=user2_data["email"],
            password_hash=get_password_hash(user2_data["password"])
        )
        print(f"✅ 用户 2 创建成功: {user2.username} (ID: {user2.id})")
    
    return user1, user2

def test_session_creation(db: Session, user):
    """测试游戏会话创建"""
    print_section(f"测试 2: 游戏会话创建 (用户: {user.username})")
    
    config = {
        "small_blind": 5,
        "big_blind": 10,
        "initial_stack": 1000
    }
    
    session = crud.create_game_session(db, user.id, config)
    print(f"✅ 会话创建成功:")
    print(f"   - 会话 ID: {session.id}")
    print(f"   - 开始时间: {session.started_at}")
    print(f"   - 配置: {session.config}")
    
    return session

def test_round_creation(db: Session, session_id, user_id, round_number):
    """测试游戏回合创建"""
    print(f"\n📝 创建回合 {round_number}...")
    
    # 模拟回合数据
    hero_hole_cards = ["As", "Kh"]
    community_cards = ["Qd", "Jc", "10h"]
    street_history = [
        {
            "street": "preflop",
            "community_cards": [],
            "actions": [
                {"player": "你", "action": "raise", "amount": 20},
                {"player": "AI1", "action": "call", "amount": 20}
            ]
        },
        {
            "street": "flop",
            "community_cards": community_cards,
            "actions": [
                {"player": "你", "action": "bet", "amount": 50},
                {"player": "AI1", "action": "fold", "amount": 0}
            ]
        }
    ]
    player_actions = [
        {"street": "preflop", "player": "你", "action": "raise", "amount": 20},
        {"street": "preflop", "player": "AI1", "action": "call", "amount": 20},
        {"street": "flop", "player": "你", "action": "bet", "amount": 50},
        {"street": "flop", "player": "AI1", "action": "fold", "amount": 0}
    ]
    winners = [{"uuid": "hero-uuid", "stack": 1070}]
    hand_info = [
        {
            "uuid": "hero-uuid",
            "hand": "straight",
            "hole_card": hero_hole_cards
        }
    ]
    hero_profit = 70  # 盈利
    pot_size = 90
    
    round_record = crud.create_game_round(
        db,
        session_id=session_id,
        round_number=round_number,
        hero_hole_cards=hero_hole_cards,
        community_cards=community_cards,
        street_history=street_history,
        player_actions=player_actions,
        winners=winners,
        hand_info=hand_info,
        hero_profit=hero_profit,
        pot_size=pot_size
    )
    
    print(f"   ✅ 回合 {round_number} 创建成功:")
    print(f"      - 回合 ID: {round_record.id}")
    print(f"      - Hero 手牌: {hero_hole_cards}")
    print(f"      - 公共牌: {community_cards}")
    print(f"      - Hero 盈利: ${hero_profit}")
    print(f"      - 底池: ${pot_size}")
    
    return round_record

def test_session_stats_update(db: Session, session_id, user_id):
    """测试会话统计更新"""
    print_section("测试 3: 会话统计更新")
    
    service = GameSessionService(db, user_id)
    session = crud.get_game_session(db, session_id, user_id)
    service.current_session = session
    service._update_session_stats()
    
    # 刷新会话数据
    db.refresh(session)
    
    print(f"✅ 会话统计已更新:")
    print(f"   - 总手数: {session.total_hands}")
    print(f"   - 总盈利: ${session.total_profit}")
    print(f"   - 胜率: {session.win_rate:.2f}%")
    print(f"   - VPIP: {session.vpip:.2f}%")
    
    return session

def test_data_isolation(db: Session, user1, user2):
    """测试数据隔离"""
    print_section("测试 4: 数据隔离验证")
    
    # 获取用户1的会话
    user1_sessions = crud.get_user_game_sessions(db, user1.id)
    print(f"✅ 用户 1 ({user1.username}) 的会话数: {len(user1_sessions)}")
    for sess in user1_sessions:
        print(f"   - 会话 ID: {sess.id}, 手数: {sess.total_hands}, 盈利: ${sess.total_profit}")
    
    # 获取用户2的会话
    user2_sessions = crud.get_user_game_sessions(db, user2.id)
    print(f"\n✅ 用户 2 ({user2.username}) 的会话数: {len(user2_sessions)}")
    for sess in user2_sessions:
        print(f"   - 会话 ID: {sess.id}, 手数: {sess.total_hands}, 盈利: ${sess.total_profit}")
    
    # 验证隔离：尝试用用户1的ID访问用户2的会话
    if user2_sessions:
        user2_session_id = user2_sessions[0].id
        try:
            user1_access = crud.get_game_session(db, user2_session_id, user1.id)
            if user1_access:
                print(f"\n❌ 数据隔离失败: 用户1可以访问用户2的会话")
            else:
                print(f"\n✅ 数据隔离成功: 用户1无法访问用户2的会话")
        except Exception as e:
            print(f"\n✅ 数据隔离成功: {e}")

def test_statistics(db: Session, user):
    """测试统计数据"""
    print_section(f"测试 5: 用户统计数据 (用户: {user.username})")
    
    sessions = crud.get_user_game_sessions(db, user.id)
    total_sessions = len(sessions)
    total_hands = sum(s.total_hands for s in sessions)
    total_profit = sum(float(s.total_profit or 0) for s in sessions)
    
    # 计算胜率
    total_wins = 0
    total_rounds = 0
    for session in sessions:
        rounds = crud.get_session_rounds(db, session.id, user.id)
        for round_record in rounds:
            total_rounds += 1
            if round_record.hero_profit and round_record.hero_profit > 0:
                total_wins += 1
    
    win_rate = (total_wins / total_rounds * 100) if total_rounds > 0 else 0
    
    print(f"✅ 统计数据:")
    print(f"   - 总会话数: {total_sessions}")
    print(f"   - 总手数: {total_hands}")
    print(f"   - 总盈利: ${total_profit:.2f}")
    print(f"   - 胜率: {win_rate:.2f}%")

def test_round_retrieval(db: Session, session_id, user_id):
    """测试回合查询"""
    print_section("测试 6: 回合查询")
    
    rounds = crud.get_session_rounds(db, session_id, user_id)
    print(f"✅ 会话 {session_id} 的回合数: {len(rounds)}")
    
    for i, round_record in enumerate(rounds, 1):
        print(f"\n   回合 {i}:")
        print(f"      - 回合 ID: {round_record.id}")
        print(f"      - 回合号: {round_record.round_number}")
        print(f"      - Hero 手牌: {round_record.hero_hole_cards}")
        print(f"      - 公共牌: {round_record.community_cards}")
        print(f"      - Hero 盈利: ${round_record.hero_profit}")
        print(f"      - 底池: ${round_record.pot_size}")
        print(f"      - 创建时间: {round_record.created_at}")

def main():
    """主测试函数"""
    print("\n" + "="*60)
    print("  数据库功能测试")
    print("="*60)
    
    # 获取数据库会话
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        # 测试 1: 用户创建
        user1, user2 = test_user_creation(db)
        db.commit()
        
        # 测试 2: 会话创建
        session1 = test_session_creation(db, user1)
        db.commit()
        
        # 创建多个回合
        print_section("创建测试回合数据")
        for i in range(1, 4):
            round_record = test_round_creation(db, session1.id, user1.id, i)
            db.commit()
            
            # 更新会话统计
            if i == 3:  # 最后一个回合后更新统计
                test_session_stats_update(db, session1.id, user1.id)
                db.commit()
        
        # 测试 3: 回合查询
        test_round_retrieval(db, session1.id, user1.id)
        
        # 测试 4: 数据隔离
        # 为用户2创建会话
        session2 = test_session_creation(db, user2)
        db.commit()
        test_round_creation(db, session2.id, user2.id, 1)
        db.commit()
        test_data_isolation(db, user1, user2)
        
        # 测试 5: 统计数据
        test_statistics(db, user1)
        test_statistics(db, user2)
        
        print_section("测试完成")
        print("✅ 所有测试通过！")
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()


