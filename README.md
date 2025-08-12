# Churn Users 이탈 원인 분석 대시보드

## 개요

이 프로젝트는 Perso.ai 서비스의 사용자 이탈 원인을 분석하기 위한 BI 대시보드입니다. Stripe 결제 데이터와 Perso.ai live-api 영상 생성 데이터를 통합하여 국가, 플랜, 사용 패턴별 이탈 특성을 분석합니다.

## 주요 기능

### 📊 데이터 시각화
- **Payment Status 비중** (파이 차트)
- **국가별 Payment Status 분포** (스택 바 차트)
- **플랜별 Payment Status 분포** (스택 바 차트)
- **Generated Videos vs Payment Status** (박스 플롯)
- **Last Video Date → Churn Date 간격 분석** (스캐터 플롯)

### 🔍 필터링 기능
- **기간 필터**: 최근 30일, 90일, 180일, 1년
- **플랜 필터**: Creator, Team, Enterprise (멀티 셀렉트)
- **국가 필터**: ISO 코드 기준 (멀티 셀렉트)
- **Payment Status 필터**: N/A, Fail, Block (멀티 셀렉트)
- **영상 생성 수 필터**: 최소값/최대값 설정

### 📈 KPI 지표
- 전체 이탈률
- 결제 실패 이탈률
- 평균 영상 생성 수 (이탈자 기준)
- 평균 활동 종료~이탈 간격

### 📋 데이터 테이블
- 사용자별 상세 정보 표시
- 정렬 기능 (이탈일, 사용자명, 플랜, 영상 수)
- 검색 기능
- 페이지네이션

## 기술 스택

- **HTML5**: 시맨틱 마크업
- **CSS3**: 반응형 디자인, Grid/Flexbox 레이아웃
- **JavaScript (ES6+)**: 동적 데이터 처리
- **Chart.js**: 차트 라이브러리
- **D3.js**: 고급 데이터 시각화

## 설치 및 실행

### 1. 파일 다운로드
프로젝트 파일들을 로컬 디렉토리에 다운로드합니다:
- `index.html`
- `styles.css`
- `script.js`

### 2. 브라우저에서 실행
`index.html` 파일을 웹 브라우저에서 열어 대시보드를 확인할 수 있습니다.

### 3. 로컬 서버 실행 (권장)
```bash
# Python 3
python -m http.server 8000

# 또는 Node.js
npx http-server

# 또는 PHP
php -S localhost:8000
```

그 후 브라우저에서 `http://localhost:8000`으로 접속합니다.

## 데이터 스키마

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| user_name | STRING | 가입 시 사용자가 설정한 이름 |
| user_id | STRING | Perso.ai 내부 부여 식별번호 |
| plan | STRING | 유저 구독 플랜 (Creator, Team, Enterprise) |
| generated_videos | INT | 해당 유저가 생성한 총 영상 개수 |
| country | STRING | Stripe 결제 국가 기준 추정 국적 |
| last_video_date | DATE | 이탈 직전 마지막 영상 생성일 |
| churn_date | DATE | 구독 해지 날짜 |
| payment_status | STRING | 결제 상태 (N/A, Fail, Block) |

## 사용법

### 1. 필터 적용
1. 상단의 필터 섹션에서 원하는 조건을 선택합니다
2. "필터 적용" 버튼을 클릭합니다
3. 대시보드가 선택된 조건에 맞게 업데이트됩니다

### 2. 차트 분석
- **파이 차트**: Payment Status별 비중을 확인하여 결제 문제가 주요 원인인지 파악
- **스택 바 차트**: 국가별/플랜별로 이탈 패턴의 차이점 분석
- **박스 플롯**: 영상 생성 수와 결제 상태의 상관관계 분석
- **스캐터 플롯**: 활동 종료와 이탈 간격의 패턴 분석

### 3. 테이블 활용
- 검색창을 사용하여 특정 사용자 검색
- 정렬 기능으로 데이터 정렬
- 페이지네이션으로 대량 데이터 탐색

## 샘플 데이터

현재 대시보드는 200개의 샘플 데이터를 사용합니다:
- 다양한 국가 (한국, 미국, 일본, 중국, 영국 등)
- 3가지 플랜 (Creator, Team, Enterprise)
- 3가지 결제 상태 (N/A, Fail, Block)
- 랜덤 생성된 영상 수와 날짜

## 실제 데이터 연동

실제 데이터를 사용하려면 `script.js`의 `generateSampleData()` 함수를 수정하여 실제 API나 데이터베이스에서 데이터를 가져오도록 변경하세요.

```javascript
// 예시: API에서 데이터 가져오기
const fetchRealData = async () => {
    const response = await fetch('/api/churn-data');
    return await response.json();
};
```

## 브라우저 호환성

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 문의사항

프로젝트에 대한 문의사항이나 개선 제안이 있으시면 이슈를 등록해 주세요. 