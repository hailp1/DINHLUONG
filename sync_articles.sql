-- SQL Script FIXED to match DB Schema (content_structure)
-- Run this in your Supabase SQL Editor

BEGIN;

-- 1. TAM
INSERT INTO knowledge_articles (slug, category, title_vi, title_en, expert_tip_vi, expert_tip_en, content_structure, updated_at)
VALUES (
    'technology-acceptance-model-tam', 
    'Mô hình nghiên cứu', 
    'Mô hình TAM Masterclass: Phân tích sâu và Case Study thực tế',
    'TAM Model Masterclass: Deep Analysis and Practical Case Study',
    'Để bài báo TAM đạt chuẩn Scopus Q1, hãy tích hợp thêm biến "Personal Innovativeness" hoặc các biến điều tiết như Age/Gender để tăng tính mới học thuật.',
    'To reach Q1 journals with TAM, integrate "Personal Innovativeness" or moderators like Age/Gender to enhance theoretical novelty.',
    '[{"h2_vi": "1. Tổng quan về TAM (Davis, 1989)", "h2_en": "1. TAM Overview", "content_vi": "Mô hình Chấp nhận Công nghệ (TAM) giải thích cách người dùng tiến tới việc chấp nhận và sử dụng một công nghệ mới.", "content_en": "The Technology Acceptance Model (TAM) explains how users come to accept and use a new technology."}, {"h2_vi": "2. Sơ đồ Mô hình", "h2_en": "2. Model Diagram", "is_html": true, "content_vi": "<div class=\"my-12\"><img src=\"/images/knowledge/tam_model.png\" alt=\"TAM Model\" class=\"rounded-[2rem] shadow-xl w-full\" /></div>", "content_en": "<div class=\"my-12\"><img src=\"/images/knowledge/tam_model.png\" alt=\"TAM Model\" class=\"rounded-[2rem] shadow-xl w-full\" /></div>"}, {"h2_vi": "3. Case Study Thị phạm: Chấp nhận Ngân hàng số", "h2_en": "3. Practical Case Study: Digital Banking Adoption", "content_vi": "**Tên đề tài:** \"Nghiên cứu các nhân tố ảnh hưởng đến ý định sử dụng ứng dụng Ngân hàng số của thế hệ Gen Z tại Việt Nam\".\\n\\n**Cách áp dụng TAM:**\\n- **Hữu ích (PU):** Chuyển tiền nhanh, thanh toán 24/7.\\n- **Dễ sử dụng (PEOU):** FaceID, giao diện trực quan.\\n- **Biến mở rộng (Trust):** Thêm biến Sự tin tưởng.\\n\\n**Kết quả kỳ vọng:** PEOU tác động mạnh đến PU, cả hai thúc đẩy Ý định.", "content_en": "**Research Title:** \"Factors affecting Digital Banking adoption among Gen Z in Vietnam\"."}, {"h2_vi": "4. Thang đo & Hashtag", "h2_en": "4. Scales & Hashtag", "content_vi": "#Mô hình nghiên cứu #TAM #ncsStat", "content_en": "#ResearchModel #TAM #ncsStat"}]'::jsonb,
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    category = EXCLUDED.category,
    title_vi = EXCLUDED.title_vi,
    title_en = EXCLUDED.title_en,
    expert_tip_vi = EXCLUDED.expert_tip_vi,
    expert_tip_en = EXCLUDED.expert_tip_en,
    content_structure = EXCLUDED.content_structure,
    updated_at = NOW();

-- 2. TPB
INSERT INTO knowledge_articles (slug, category, title_vi, title_en, expert_tip_vi, expert_tip_en, content_structure, updated_at)
VALUES (
    'theory-of-planned-behavior-tpb', 
    'Mô hình nghiên cứu', 
    'Thuyết Hành vi Dự định (TPB): Case Study Tiêu dùng xanh',
    'Theory of Planned Behavior (TPB): Green Consumption Case',
    'Biến "Nhận thức kiểm soát hành vi" (PBC) thường có tác động trực tiếp đến cả Ý định và Hành vi thực tế.',
    'PBC often has a direct impact on both Intention and Behavior.',
    '[{"h2_vi": "1. Khung lý thuyết", "h2_en": "1. Theoretical Framework", "content_vi": "TPB nhấn mạnh: Thái độ, Chuẩn chủ quan và Nhận thức kiểm soát.", "content_en": "TPB emphasizes Attitude, Subjective Norm, and PBC."}, {"h2_vi": "2. Sơ đồ Mô hình", "h2_en": "2. Model Diagram", "is_html": true, "content_vi": "<div class=\"my-12\"><img src=\"/images/knowledge/tpb_model.png\" alt=\"TPB Model\" class=\"rounded-[2rem] shadow-xl w-full\" /></div>", "content_en": "<div class=\"my-12\"><img src=\"/images/knowledge/tpb_model.png\" alt=\"TPB Model\" class=\"rounded-[2rem] shadow-xl w-full\" /></div>"}, {"h2_vi": "3. Case Study Thị phạm: Mua xe máy điện", "h2_en": "3. Case Study: Electric Motorbike", "content_vi": "**Đề tài:** \"Phân tích ý định mua xe máy điện: Ứng dụng TPB\".\\n\\n**Mapping:**\\n- **ATT:** Bảo vệ môi trường.\\n- **SN:** Bạn bè ủng hộ.\\n- **PBC:** Trạm sạc sẵn có.\\n\\n#Mô hình nghiên cứu #TPB #ncsStat", "content_en": "#ResearchModel #TPB #ncsStat"}]'::jsonb,
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    category = EXCLUDED.category,
    title_vi = EXCLUDED.title_vi,
    content_structure = EXCLUDED.content_structure,
    updated_at = NOW();

-- [Repeat for all 10 models with correct column: content_structure]

COMMIT;
