// 고정된 랜덤 시드 생성 함수
const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    const result = x - Math.floor(x);
    // 첫 몇 개만 로깅 (너무 많은 로그 방지)
    if (seed < 10) {
        console.log(`seededRandom(${seed}) = ${result}`);
    }
    return result;
};

// 샘플 데이터 생성
const generateSampleData = () => {
    console.log('Generating sample data...'); // 디버깅 로그 추가
    
    const countries = ['한국', '미국', '일본', '중국', '영국', '독일', '프랑스', '캐나다', '호주', '브라질'];
    const plans = ['Creator', 'Team', 'Enterprise'];


    const data = [];
    const today = new Date();
    let seed = 12345; // 고정된 시드 값
    
    // 국가별 전체 사용자 수 정의 (더미 데이터)
    const countryTotalUsers = {
        '한국': 1200,
        '미국': 800,
        '일본': 450,
        '중국': 380,
        '영국': 280,
        '독일': 220,
        '프랑스': 180,
        '캐나다': 150,
        '호주': 120,
        '브라질': 80
    };
    
    // 국가별 사용자 수 정의 (Churn 데이터용)
    const countryDistribution = {
        '한국': 80,
        '미국': 30,
        '일본': 15,
        '중국': 12,
        '영국': 8,
        '독일': 6,
        '프랑스': 4,
        '캐나다': 3,
        '호주': 2,
        '브라질': 1
    };
    
    // 각 국가별로 사용자 생성
    Object.entries(countryDistribution).forEach(([country, count]) => {
        console.log(`Generating ${count} users for ${country}`); // 디버깅 로그 추가
        for (let i = 0; i < count; i++) {
                         // 결제 상태 분포: Cancel 70%, Fail 20%, Block 10%
             let payment_status;
             const rand = seededRandom(seed++);
             if (rand < 0.7) {
                 payment_status = 'Cancel';
             } else if (rand < 0.9) {
                 payment_status = 'Fail';
             } else {
                 payment_status = 'Block';
             }
            
            const user = {
                user_id: `pbeuseq-${String(Math.floor(seededRandom(seed++) * 900000) + 100000)}`,
                plan: plans[Math.floor(seededRandom(seed++) * plans.length)],
                generated_videos: Math.floor(seededRandom(seed++) * 100) + 1,
                country: country,
                last_video_date: new Date(today.getTime() - seededRandom(seed++) * 90 * 24 * 60 * 60 * 1000),
                churn_date: new Date(today.getTime() - seededRandom(seed++) * 30 * 24 * 60 * 60 * 1000),
                payment_status: payment_status
            };
            
            // 구독 종료일은 이탈일과 같거나 이탈일 이후여야 함
            const churnDate = new Date(user.churn_date);
            const daysAfterChurn = Math.floor(seededRandom(seed++) * 30) + 1; // 1~30일 후
            user.subscription_end_date = new Date(churnDate.getTime() + daysAfterChurn * 24 * 60 * 60 * 1000);
            data.push(user);
            
            // 첫 번째 사용자 데이터 로깅
            if (data.length === 1) {
                console.log('First user created:', user);
            }
        }
    });
    
    // 기본 정렬: 이탈일 최신순
    data.sort((a, b) => new Date(b.churn_date) - new Date(a.churn_date));
    
    console.log('Sample data generated:', {
        totalCount: data.length,
        sampleItem: data[0],
        firstThreeItems: data.slice(0, 3)
    });
    
    return { data, countryTotalUsers };
};

// 전역 변수
let allData = [];
let filteredData = []; // Table 뷰용 필터링된 데이터
let statisticsFilteredData = []; // Statistics 뷰용 필터링된 데이터 (기간 필터 적용)
let countryTotalUsers = {}; // 국가별 전체 사용자 수
let currentPage = 1;
const itemsPerPage = 20;
let countryRankingChart = null; // Chart.js 인스턴스 저장용
let planStackedChart = null; // 플랜별 이탈원인 차트 인스턴스 저장용

 // 차트 색상 정의
 const colors = {
     'Cancel': '#6c757d',
     'Fail': '#dc3545',
     'Block': '#fd7e14',
     'Creator': '#28a745',
     'Team': '#007bff',
     'Enterprise': '#6f42c1'
 };

// 유틸리티 함수들
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ko-KR');
};

const formatNumber = (num) => {
    return num.toLocaleString('ko-KR');
};

const calculateDaysBetween = (date1, date2) => {
    return Math.floor((new Date(date2) - new Date(date1)) / (1000 * 60 * 60 * 24));
};

// 필터 팝업 관련 변수
let currentFilterType = null;
let currentFilterColumn = null;
let activeFilters = {};

// 필터 팝업 표시
const showFilterPopup = (column, type) => {
    currentFilterColumn = column;
    currentFilterType = type;
    
    const popup = document.getElementById('filter-popup');
    const title = document.getElementById('filter-title');
    
    // 모든 필터 섹션 숨기기
    document.querySelectorAll('.filter-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 필터 타입에 따라 적절한 섹션 표시
    switch (type) {
        case 'text':
            document.getElementById('text-filter').style.display = 'block';
            title.textContent = `${getColumnName(column)} 검색`;
            break;
        case 'range':
            document.getElementById('range-filter').style.display = 'block';
            title.textContent = `${getColumnName(column)} 범위 설정`;
            break;
        case 'date':
            document.getElementById('date-range-filter').style.display = 'block';
            title.textContent = `${getColumnName(column)} 날짜 범위`;
            break;
        case 'select':
            document.getElementById('select-filter').style.display = 'block';
            title.textContent = `${getColumnName(column)} 선택`;
            populateSelectOptions(column);
            break;
    }
    
    popup.classList.add('show');
};

// 컬럼명 가져오기
const getColumnName = (column) => {
    const columnNames = {
        'user_id': '사용자 ID',
        'plan': '플랜',
        'generated_videos': '생성 영상 수',
        'country': '국가',
        'last_video_date': '마지막 영상일',
        'churn_date': '이탈일',
        'payment_status': '이탈 원인'
    };
    return columnNames[column] || column;
};

// 셀렉트 옵션 채우기
const populateSelectOptions = (column) => {
    const select = document.getElementById('select-filter-options');
    select.innerHTML = '<option value="">전체</option>';
    
         const options = {
         'plan': ['Creator', 'Team', 'Enterprise'],
         'country': ['한국', '미국', '일본', '중국', '영국', '독일', '프랑스', '캐나다', '호주', '브라질'],
         'payment_status': ['Cancel', 'Fail', 'Block']
     };
    
    if (options[column]) {
        options[column].forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
    }
};

// 필터 적용
const applyFilter = () => {
    console.log('applyFilter called'); // 디버깅용
    console.log('currentFilterType:', currentFilterType); // 디버깅용
    console.log('currentFilterColumn:', currentFilterColumn); // 디버깅용
    
    let filterValue = null;
    
    switch (currentFilterType) {
        case 'text':
            filterValue = document.getElementById('text-filter-input').value.trim();
            console.log('Text filter value:', filterValue); // 디버깅용
            if (filterValue === '') filterValue = null;
            break;
        case 'range':
            const min = document.getElementById('range-min').value.trim();
            const max = document.getElementById('range-max').value.trim();
            console.log('Range filter values:', { min, max }); // 디버깅용
            if (min || max) {
                filterValue = { min: min || '', max: max || '' };
            }
            break;
        case 'date':
            const dateMin = document.getElementById('date-min').value;
            const dateMax = document.getElementById('date-max').value;
            console.log('Date filter values:', { dateMin, dateMax }); // 디버깅용
            if (dateMin || dateMax) {
                filterValue = { min: dateMin || '', max: dateMax || '' };
            }
            break;
        case 'select':
            filterValue = document.getElementById('select-filter-options').value;
            console.log('Select filter value:', filterValue); // 디버깅용
            if (filterValue === '') filterValue = null;
            break;
    }
    
    console.log('Final filter value:', filterValue); // 디버깅용
    
    if (filterValue) {
        activeFilters[currentFilterColumn] = filterValue;
        console.log('Added filter:', currentFilterColumn, filterValue); // 디버깅용
    } else {
        delete activeFilters[currentFilterColumn];
        console.log('Removed filter:', currentFilterColumn); // 디버깅용
    }
    
    console.log('Active filters after update:', activeFilters); // 디버깅용
    
    applyFilters();
    hideFilterPopup();
};

// 필터 적용 함수
const applyFilters = () => {
    console.log('Applying filters:', activeFilters); // 디버깅용
    
    // 활성 필터가 없으면 모든 데이터 표시
    if (Object.keys(activeFilters).length === 0) {
        filteredData = [...allData];
        console.log('No active filters, showing all data:', filteredData.length);
    } else {
        filteredData = allData.filter(user => {
            for (const [column, filterValue] of Object.entries(activeFilters)) {
                if (!filterValue || (typeof filterValue === 'string' && filterValue.trim() === '')) {
                    continue; // 빈 필터는 무시
                }
                
                if (typeof filterValue === 'object') {
                    // 범위 필터
                    if (filterValue.min !== undefined && filterValue.min !== '') {
                        if (column === 'last_video_date' || column === 'churn_date') {
                            const userDate = new Date(user[column]);
                            const minDate = new Date(filterValue.min);
                            if (userDate < minDate) return false;
                        } else {
                            const minValue = parseFloat(filterValue.min);
                            if (user[column] < minValue) return false;
                        }
                    }
                    if (filterValue.max !== undefined && filterValue.max !== '') {
                        if (column === 'last_video_date' || column === 'churn_date') {
                            const userDate = new Date(user[column]);
                            const maxDate = new Date(filterValue.max);
                            if (userDate > maxDate) return false;
                        } else {
                            const maxValue = parseFloat(filterValue.max);
                            if (user[column] > maxValue) return false;
                        }
                    }
                } else {
                    // 단일 값 필터
                    if (column === 'user_id') {
                        if (!user[column].toLowerCase().includes(filterValue.toLowerCase())) {
                            return false;
                        }
                    } else if (column === 'plan' || column === 'country' || column === 'payment_status') {
                        if (user[column] !== filterValue) {
                            return false;
                        }
                    }
                }
            }
            return true;
        });
    }
    
    console.log('Filtered data count:', filteredData.length); // 디버깅용
    console.log('Sample filtered data:', filteredData.slice(0, 3)); // 디버깅용
    
    currentPage = 1;
    
    // 테이블과 KPI만 업데이트 (차트는 나중에)
    updateKPIs();
    updateTable();
    updateFilterButtons();
    
    // 차트 업데이트는 별도로 처리
    setTimeout(() => {
        updateCharts();
    }, 100);
};

// 필터 버튼 상태 업데이트
const updateFilterButtons = () => {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const column = btn.dataset.filter;
        if (activeFilters[column]) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
};

// 필터 팝업 숨기기
const hideFilterPopup = () => {
    document.getElementById('filter-popup').classList.remove('show');
    // 입력 필드 초기화
    document.getElementById('text-filter-input').value = '';
    document.getElementById('range-min').value = '';
    document.getElementById('range-max').value = '';
    document.getElementById('date-min').value = '';
    document.getElementById('date-max').value = '';
    document.getElementById('select-filter-options').value = '';
};

// 기간 필터 관련 함수들
const setupDateFilter = () => {
    const quickFilterBtns = document.querySelectorAll('.quick-filter-btn');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const applyDateFilterBtn = document.querySelector('.apply-date-filter-btn');

    // 빠른 필터 버튼 이벤트
    quickFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 모든 버튼에서 active 클래스 제거
            quickFilterBtns.forEach(b => b.classList.remove('active'));
            // 클릭된 버튼에 active 클래스 추가
            btn.classList.add('active');

            const days = parseInt(btn.dataset.period);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - days);

            startDateInput.value = startDate.toISOString().split('T')[0];
            endDateInput.value = endDate.toISOString().split('T')[0];

            console.log('Quick filter clicked:', {
                days,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });

            // 자동으로 필터 적용
            applyDateFilter();
        });
    });

    // 수동 날짜 입력 시 빠른 필터 버튼 선택 해제
    startDateInput.addEventListener('change', () => {
        // 모든 빠른 필터 버튼에서 active 클래스 제거
        quickFilterBtns.forEach(btn => btn.classList.remove('active'));
    });

    endDateInput.addEventListener('change', () => {
        // 모든 빠른 필터 버튼에서 active 클래스 제거
        quickFilterBtns.forEach(btn => btn.classList.remove('active'));
    });

    // 적용 버튼 이벤트
    applyDateFilterBtn.addEventListener('click', applyDateFilter);
};

const applyDateFilter = () => {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    // 이탈일 필터링
    let finalFilteredData = allData;
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            alert('이탈일 시작일은 종료일보다 이전이어야 합니다.');
            return;
        }

        finalFilteredData = allData.filter(user => {
            const churnDate = new Date(user.churn_date);
            return churnDate >= start && churnDate <= end;
        });
    }

    // 최종 필터링된 데이터를 statisticsFilteredData에 저장
    statisticsFilteredData = finalFilteredData;

    console.log('Date filter applied for Statistics view:', {
        churnStartDate: startDate,
        churnEndDate: endDate,
        originalDataCount: allData.length,
        statisticsFilteredDataCount: statisticsFilteredData.length,
        sampleFilteredData: statisticsFilteredData.slice(0, 3)
    });

    // KPI 업데이트 (Statistics 뷰용)
    updateKPIs();
    
    // 차트 업데이트는 약간의 지연 후 실행 (DOM 업데이트 완료 후)
    setTimeout(() => {
        updateCharts();
    }, 200);
};

// 변화율 계산 함수들
const calculateChangeRate = (currentValue, previousValue) => {
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - previousValue) / previousValue) * 100;
};

const formatChangeRate = (rate, isPercentage = false, unit = '') => {
    const sign = rate >= 0 ? '+' : '';
    const formattedRate = Math.abs(rate).toFixed(1);
    
    if (isPercentage) {
        return `${sign}${formattedRate}%`;
    } else if (unit === '일') {
        return `${sign}${formattedRate}일`;
    } else {
        return `${sign}${formattedRate}`;
    }
};

const getComparisonData = (startDate, endDate) => {
    const periodLength = endDate - startDate;
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate.getTime());
    
    // 현재 기간 데이터
    const currentPeriodData = allData.filter(user => {
        const churnDate = new Date(user.churn_date);
        return churnDate >= startDate && churnDate <= endDate;
    });
    
    // 이전 기간 데이터
    const previousPeriodData = allData.filter(user => {
        const churnDate = new Date(user.churn_date);
        return churnDate >= previousStartDate && churnDate <= previousEndDate;
    });
    
    return { currentPeriodData, previousPeriodData };
};

const updateKPIs = () => {
    // 현재 활성화된 뷰 확인
    const statisticsView = document.getElementById('statistics-view');
    const isStatisticsActive = statisticsView && statisticsView.classList.contains('active');
    
    // 현재 선택된 기간 가져오기
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    let startDate, endDate;
    
    if (startDateInput.value && endDateInput.value) {
        startDate = new Date(startDateInput.value);
        endDate = new Date(endDateInput.value);
    } else {
        // 기본값: 최근 30일
        endDate = new Date();
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Statistics 뷰일 때는 statisticsFilteredData 사용, Table 뷰일 때는 filteredData 사용
    const dataToUse = isStatisticsActive ? statisticsFilteredData : filteredData;
    
    console.log('updateKPIs called:', {
        isStatisticsActive,
        dataSource: isStatisticsActive ? 'statisticsFilteredData' : 'filteredData',
        dataCount: dataToUse.length
    });
    
    // 비교 데이터 가져오기
    const { currentPeriodData, previousPeriodData } = getComparisonData(startDate, endDate);
    
    // 현재 기간 KPI 계산
    const currentChurnedUsers = currentPeriodData.length;
    const currentCreatorUsers = currentPeriodData.filter(u => u.plan === 'Creator').length;
    const currentTeamUsers = currentPeriodData.filter(u => u.plan === 'Team').length;
    const currentEnterpriseUsers = currentPeriodData.filter(u => u.plan === 'Enterprise').length;
    const currentAvgVideos = currentPeriodData.length > 0 ? 
        (currentPeriodData.reduce((sum, u) => sum + u.generated_videos, 0) / currentPeriodData.length) : 0;
    const currentAvgChurnGap = currentPeriodData.length > 0 ? 
        (currentPeriodData.reduce((sum, u) => sum + calculateDaysBetween(u.last_video_date, u.churn_date), 0) / currentPeriodData.length) : 0;
    
    // 이전 기간 KPI 계산
    const previousChurnedUsers = previousPeriodData.length;
    const previousCreatorUsers = previousPeriodData.filter(u => u.plan === 'Creator').length;
    const previousTeamUsers = previousPeriodData.filter(u => u.plan === 'Team').length;
    const previousEnterpriseUsers = previousPeriodData.filter(u => u.plan === 'Enterprise').length;
    const previousAvgVideos = previousPeriodData.length > 0 ? 
        (previousPeriodData.reduce((sum, u) => sum + u.generated_videos, 0) / previousPeriodData.length) : 0;
    const previousAvgChurnGap = previousPeriodData.length > 0 ? 
        (previousPeriodData.reduce((sum, u) => sum + calculateDaysBetween(u.last_video_date, u.churn_date), 0) / previousPeriodData.length) : 0;
    
    // 변화율 계산
    const churnedUsersChange = calculateChangeRate(currentChurnedUsers, previousChurnedUsers);
    const creatorUsersChange = calculateChangeRate(currentCreatorUsers, previousCreatorUsers);
    const teamUsersChange = calculateChangeRate(currentTeamUsers, previousTeamUsers);
    const enterpriseUsersChange = calculateChangeRate(currentEnterpriseUsers, previousEnterpriseUsers);
    const avgVideosChange = calculateChangeRate(currentAvgVideos, previousAvgVideos);
    const avgChurnGapChange = calculateChangeRate(currentAvgChurnGap, previousAvgChurnGap);
    
    // KPI 값 업데이트
    document.getElementById('total-churn-rate').textContent = currentChurnedUsers.toString();
    
    // 플랜별 이탈자 수를 절대 수로 표시 (Creator:Team:Enterprise)
    document.getElementById('payment-fail-rate').textContent = `${currentCreatorUsers}:${currentTeamUsers}:${currentEnterpriseUsers}`;
    
    document.getElementById('avg-videos').textContent = currentAvgVideos.toFixed(1);
    document.getElementById('avg-churn-gap').textContent = `${currentAvgChurnGap.toFixed(1)}일`;
    
    // 변화율 표시 업데이트
    
    if (document.getElementById('total-churn-change')) {
        document.getElementById('total-churn-change').textContent = formatChangeRate(churnedUsersChange, true);
        document.getElementById('total-churn-change').className = `kpi-change ${churnedUsersChange >= 0 ? 'positive' : 'negative'}`;
    }
    

    
    if (document.getElementById('avg-videos-change')) {
        document.getElementById('avg-videos-change').textContent = formatChangeRate(avgVideosChange, false);
        document.getElementById('avg-videos-change').className = `kpi-change ${avgVideosChange >= 0 ? 'positive' : 'negative'}`;
    }
    
    if (document.getElementById('avg-churn-gap-change')) {
        document.getElementById('avg-churn-gap-change').textContent = formatChangeRate(avgChurnGapChange, false, '일');
        document.getElementById('avg-churn-gap-change').className = `kpi-change ${avgChurnGapChange >= 0 ? 'positive' : 'negative'}`;
    }
};

// 국가별 Churn 지도
const createChurnMap = () => {
    const container = document.getElementById('churn-map');
    container.innerHTML = '';
    
    // 국가별 churn 데이터 집계
    const countryChurnData = {};
    statisticsFilteredData.forEach(user => {
        countryChurnData[user.country] = (countryChurnData[user.country] || 0) + 1;
    });

    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // 투영 설정 - 완전히 중앙정렬
    const projection = d3.geoMercator()
        .scale(Math.min(width, height) / 2.5)
        .center([0, 0])
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // 색상 스케일
    const maxChurn = Math.max(...Object.values(countryChurnData));
    const colorScale = d3.scaleLinear()
        .domain([0, maxChurn])
        .range(['#e3f2fd', '#1976d2']);

    // 국가명을 ISO 코드로 매핑
    const countryToISO = {
        '한국': 'KR',
        '미국': 'US',
        '일본': 'JP',
        '중국': 'CN',
        '영국': 'GB',
        '독일': 'DE',
        '프랑스': 'FR',
        '캐나다': 'CA',
        '호주': 'AU',
        '브라질': 'BR'
    };

    // 실제 세계지도 데이터 (간소화된 버전)
    const worldData = {
        type: "FeatureCollection",
        features: [
            // 한국
            {
                type: "Feature",
                properties: { name: "한국", id: "KR" },
                geometry: {
                    type: "Polygon",
                    coordinates: [[[125, 35], [132, 35], [132, 38], [125, 38], [125, 35]]]
                }
            },
            // 미국
            {
                type: "Feature",
                properties: { name: "미국", id: "US" },
                geometry: {
                    type: "Polygon",
                    coordinates: [[[-125, 25], [-65, 25], [-65, 50], [-125, 50], [-125, 25]]]
                }
            },
            // 일본
            {
                type: "Feature",
                properties: { name: "일본", id: "JP" },
                geometry: {
                    type: "Polygon",
                    coordinates: [[[130, 30], [145, 30], [145, 45], [130, 45], [130, 30]]]
                }
            },
            // 중국
            {
                type: "Feature",
                properties: { name: "중국", id: "CN" },
                geometry: {
                    type: "Polygon",
                    coordinates: [[[75, 20], [135, 20], [135, 50], [75, 50], [75, 20]]]
                }
            },
            // 영국
            {
                type: "Feature",
                properties: { name: "영국", id: "GB" },
                geometry: {
                    type: "Polygon",
                    coordinates: [[[-10, 50], [5, 50], [5, 60], [-10, 60], [-10, 50]]]
                }
            },
            // 독일
            {
                type: "Feature",
                properties: { name: "독일", id: "DE" },
                geometry: {
                    type: "Polygon",
                    coordinates: [[[5, 47], [15, 47], [15, 55], [5, 55], [5, 47]]]
                }
            },
            // 프랑스
            {
                type: "Feature",
                properties: { name: "프랑스", id: "FR" },
                geometry: {
                    type: "Polygon",
                    coordinates: [[[-5, 42], [10, 42], [10, 51], [-5, 51], [-5, 42]]]
                }
            },
            // 캐나다
            {
                type: "Feature",
                properties: { name: "캐나다", id: "CA" },
                geometry: {
                    type: "Polygon",
                    coordinates: [[[-140, 50], [-50, 50], [-50, 75], [-140, 75], [-140, 50]]]
                }
            },
            // 호주
            {
                type: "Feature",
                properties: { name: "호주", id: "AU" },
                geometry: {
                    type: "Polygon",
                    coordinates: [[[110, -45], [155, -45], [155, -10], [110, -10], [110, -45]]]
                }
            },
            // 브라질
            {
                type: "Feature",
                properties: { name: "브라질", id: "BR" },
                geometry: {
                    type: "Polygon",
                    coordinates: [[[-75, -35], [-35, -35], [-35, 5], [-75, 5], [-75, -35]]]
                }
            }
        ]
    };

    // 지도 그리기
    svg.selectAll('path')
        .data(worldData.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', d => {
            const countryName = d.properties.name;
            const churnCount = countryChurnData[countryName] || 0;
            
            // 한국은 특별한 색상
            if (countryName === '한국') {
                return '#0d47a1';
            }
            
            return colorScale(churnCount);
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 1);
            
            const countryName = d.properties.name;
            const churnCount = countryChurnData[countryName] || 0;
            
            const tooltip = svg.append('g')
                .attr('class', 'tooltip')
                .attr('transform', `translate(${event.pageX + 10}, ${event.pageY - 10})`);
            
            tooltip.append('rect')
                .attr('width', 120)
                .attr('height', 60)
                .attr('fill', 'rgba(0, 0, 0, 0.8)')
                .attr('rx', 5);
            
            tooltip.append('text')
                .attr('x', 10)
                .attr('y', 20)
                .attr('fill', 'white')
                .attr('font-size', '12px')
                .text(countryName);
            
            tooltip.append('text')
                .attr('x', 10)
                .attr('y', 40)
                .attr('fill', 'white')
                .attr('font-size', '12px')
                .text(`Churn: ${churnCount}명`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.8);
            svg.selectAll('.tooltip').remove();
        });

    // 범례 추가
    const legend = svg.append('g')
        .attr('transform', `translate(20, ${height - 120})`);

    legend.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('fill', '#333')
        .text('Churn 수');

    // 범례 색상 스케일
    const legendWidth = 200;
    const legendHeight = 20;

    const legendScale = d3.scaleLinear()
        .domain([0, maxChurn])
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d => Math.round(d));

    legend.append('g')
        .attr('transform', `translate(0, 30)`)
        .call(legendAxis);

    // 범례 그라데이션
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
        .attr('id', 'legendGradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');

    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#e3f2fd');

    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#1976d2');

    legend.append('rect')
        .attr('x', 0)
        .attr('y', 10)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#legendGradient)')
        .attr('stroke', '#ccc');
};

// 플랜별 Payment Status 스택 바 차트
const createPlanStackedChart = () => {
    try {
        const ctx = document.getElementById('plan-stacked-chart').getContext('2d');
        
        // 기존 차트가 있으면 제거
        if (planStackedChart) {
            planStackedChart.destroy();
        }
        
        const planData = {};
        statisticsFilteredData.forEach(user => {
            if (!planData[user.plan]) {
                planData[user.plan] = { 'Cancel': 0, 'Fail': 0, 'Block': 0 };
            }
            planData[user.plan][user.payment_status]++;
        });

        // 플랜 순서를 Creator, Team, Enterprise 순으로 고정
        const planOrder = ['Creator', 'Team', 'Enterprise'];
        const plans = planOrder.filter(plan => planData[plan]); // 데이터가 있는 플랜만 필터링
        
        const datasets = ['Cancel', 'Fail', 'Block'].map(status => ({
            label: status,
            data: plans.map(plan => planData[plan][status] || 0),
            backgroundColor: colors[status]
        }));

        planStackedChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: plans,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    } catch (error) {
        console.error('Error creating plan stacked chart:', error);
    }
};

// 박스 플롯 (D3.js 사용)
const createBoxPlot = () => {
    const container = document.getElementById('box-plot');
    container.innerHTML = '';
    
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // 박스 플롯 데이터 준비
    const paymentGroups = {};
    statisticsFilteredData.forEach(user => {
        if (!paymentGroups[user.payment_status]) {
            paymentGroups[user.payment_status] = [];
        }
        paymentGroups[user.payment_status].push(user.generated_videos);
    });

    const boxData = Object.keys(paymentGroups).map(status => {
        const values = paymentGroups[status].sort((a, b) => a - b);
        const q1 = d3.quantile(values, 0.25);
        const q2 = d3.quantile(values, 0.5);
        const q3 = d3.quantile(values, 0.75);
        const iqr = q3 - q1;
        const min = Math.max(q1 - 1.5 * iqr, d3.min(values));
        const max = Math.min(q3 + 1.5 * iqr, d3.max(values));
        
        return {
            status: status,
            min: min,
            q1: q1,
            q2: q2,
            q3: q3,
            max: max
        };
    });

    const x = d3.scaleBand()
        .domain(boxData.map(d => d.status))
        .range([0, width])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([0, d3.max(boxData, d => d.max)])
        .range([height, 0]);

    // 박스 그리기
    svg.selectAll('.box')
        .data(boxData)
        .enter()
        .append('g')
        .attr('class', 'box')
        .each(function(d) {
            const g = d3.select(this);
            
            // 박스
            g.append('rect')
                .attr('x', x(d.status) + x.bandwidth() * 0.1)
                .attr('y', y(d.q3))
                .attr('width', x.bandwidth() * 0.8)
                .attr('height', y(d.q1) - y(d.q3))
                .attr('fill', colors[d.status])
                .attr('stroke', '#333')
                .attr('stroke-width', 1);
            
            // 중앙선
            g.append('line')
                .attr('x1', x(d.status) + x.bandwidth() * 0.5)
                .attr('x2', x(d.status) + x.bandwidth() * 0.5)
                .attr('y1', y(d.q2))
                .attr('y2', y(d.q2))
                .attr('stroke', '#333')
                .attr('stroke-width', 2);
            
            // 수염
            g.append('line')
                .attr('x1', x(d.status) + x.bandwidth() * 0.5)
                .attr('x2', x(d.status) + x.bandwidth() * 0.5)
                .attr('y1', y(d.max))
                .attr('y2', y(d.min))
                .attr('stroke', '#333')
                .attr('stroke-width', 1);
            
            // 수염 끝
            g.append('line')
                .attr('x1', x(d.status) + x.bandwidth() * 0.3)
                .attr('x2', x(d.status) + x.bandwidth() * 0.7)
                .attr('y1', y(d.max))
                .attr('y2', y(d.max))
                .attr('stroke', '#333')
                .attr('stroke-width', 1);
            
            g.append('line')
                .attr('x1', x(d.status) + x.bandwidth() * 0.3)
                .attr('x2', x(d.status) + x.bandwidth() * 0.7)
                .attr('y1', y(d.min))
                .attr('y2', y(d.min))
                .attr('stroke', '#333')
                .attr('stroke-width', 1);
        });

    // 축
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append('g')
        .call(d3.axisLeft(y));

    // 제목
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Payment Status별 영상 생성 수 분포');
};

// 스캐터 플롯 (Chart.js 사용) - 플랜별 색상 구분
const createScatterPlot = () => {
    try {
        console.log('Creating scatter plot...');
        
        const container = document.getElementById('scatter-plot');
        if (!container) {
            console.error('Scatter plot container not found');
            return;
        }
        
        container.innerHTML = '';
        
        // Chart.js 라이브러리 확인
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library not loaded!');
            container.innerHTML = '<p class="error">Chart.js 라이브러리가 로드되지 않았습니다.</p>';
            return;
        }
        
        // 데이터 준비
        const data = statisticsFilteredData.map(user => ({
            x: calculateDaysBetween(user.last_video_date, user.churn_date),
            y: user.generated_videos,
            plan: user.plan
        }));
        
        console.log('Scatter plot data:', data.slice(0, 5));
        
        if (data.length === 0) {
            container.innerHTML = '<p class="no-data">데이터가 없습니다.</p>';
            return;
        }
        
        // 플랜별로 데이터 분리
        const planData = {};
        data.forEach(point => {
            if (!planData[point.plan]) {
                planData[point.plan] = [];
            }
            planData[point.plan].push(point);
        });
        
        console.log('Plan data separated:', Object.keys(planData));
        
        // 플랜 순서를 Creator, Team, Enterprise 순으로 고정
        const planOrder = ['Creator', 'Team', 'Enterprise'];
        const orderedPlans = planOrder.filter(plan => planData[plan]);
        
        // Canvas 생성
        const canvas = document.createElement('canvas');
        canvas.id = 'scatter-plot-chart';
        canvas.style.width = '100%';
        canvas.style.height = '400px';
        container.appendChild(canvas);
        
        // 기존 차트 제거
        if (window.scatterPlotChart) {
            console.log('Destroying existing scatter plot chart');
            window.scatterPlotChart.destroy();
        }
        
        // 새 차트 생성
        const ctx = canvas.getContext('2d');
        console.log('Creating new scatter plot chart...');
        
        window.scatterPlotChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: orderedPlans.map(plan => ({
                    label: `${plan} 플랜`,
                    data: planData[plan].map(point => ({
                        x: point.x,
                        y: point.y
                    })),
                    backgroundColor: colors[plan],
                    borderColor: colors[plan],
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBorderWidth: 1,
                    pointBorderColor: '#ffffff'
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return `${context[0].dataset.label}`;
                            },
                            label: function(context) {
                                return [
                                    `마지막 영상일 ~ 이탈일: ${context.parsed.x}일`,
                                    `생성 영상 수: ${context.parsed.y}개`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: '마지막 영상일 ~ 이탈일 간격 (일)',
                            font: { size: 12 }
                        },
                        ticks: {
                            font: { size: 11 }
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: '생성 영상 수 (개)',
                            font: { size: 12 }
                        },
                        ticks: {
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
        
        console.log('Scatter plot chart created successfully!');
        
    } catch (error) {
        console.error('Error creating scatter plot:', error);
        const container = document.getElementById('scatter-plot');
        if (container) {
            container.innerHTML = '<p class="error">산점도 생성 중 오류가 발생했습니다: ' + error.message + '</p>';
        }
    }
};

// 국가별 Churn 분석 차트 (Chart.js 사용) - 테스트 버전
const createCountryRanking = () => {
    try {
        console.log('=== Creating country ranking chart ===');
        
        // 1. 컨테이너 확인 및 초기화
        const container = document.getElementById('country-ranking');
        if (!container) {
            console.error('Country ranking container not found!');
            return;
        }
        
        console.log('Container found, clearing...');
        container.innerHTML = '';
        
        // 2. Chart.js 라이브러리 확인
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library not loaded!');
            container.innerHTML = '<p class="error">Chart.js 라이브러리가 로드되지 않았습니다.</p>';
            return;
        }
        
        console.log('Chart.js library loaded successfully');
        
        // 3. 데이터 확인
        console.log('Statistics filtered data:', {
            length: statisticsFilteredData ? statisticsFilteredData.length : 0,
            sample: statisticsFilteredData ? statisticsFilteredData.slice(0, 3) : []
        });
        
        console.log('Country total users:', countryTotalUsers);
        
        // 4. 국가별 Churn 데이터 집계
        const countryChurnData = {};
        statisticsFilteredData.forEach(user => {
            countryChurnData[user.country] = (countryChurnData[user.country] || 0) + 1;
        });
        
        console.log('Churn data aggregated:', countryChurnData);
        
        // 5. 분석 데이터 생성 (전체 유저 수와 비교)
        const analysisData = Object.keys(countryTotalUsers).map(country => {
            const churnCount = countryChurnData[country] || 0;
            const totalUsers = countryTotalUsers[country];
            const churnRate = totalUsers > 0 ? (churnCount / totalUsers) * 100 : 0;
            
            return {
                country: country,
                churnCount: churnCount,
                totalUsers: totalUsers,
                churnRate: churnRate
            };
        }).filter(item => item.churnCount > 0); // Churn이 있는 국가만
        
        // 6. 정렬 (Churn 비율 기준으로 정렬하여 통계적 bias 방지)
        analysisData.sort((a, b) => b.churnRate - a.churnRate);
        
        // 7. 상위 8개 국가 선택
        const topCountries = analysisData.slice(0, 8);
        
        console.log('Top countries analysis:', topCountries);
        
        if (topCountries.length === 0) {
            container.innerHTML = '<p class="no-data">Churn 데이터가 없습니다.</p>';
            return;
        }
        
        // 8. Canvas 생성
        const canvas = document.createElement('canvas');
        canvas.id = 'country-ranking-chart';
        canvas.style.width = '100%';
        canvas.style.height = '400px';
        container.appendChild(canvas);
        
        // 9. 기존 차트 제거
        if (countryRankingChart) {
            console.log('Destroying existing chart');
            countryRankingChart.destroy();
        }
        
        // 10. 이중 Y축 차트 생성 (절대 수와 비율 동시 표시)
        const ctx = canvas.getContext('2d');
        console.log('Creating new chart with real data...');
        
        countryRankingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topCountries.map(d => d.country),
                datasets: [
                    {
                        label: 'Churn 수 (명)',
                        data: topCountries.map(d => d.churnCount),
                        backgroundColor: 'rgba(103, 58, 183, 0.8)',
                        borderColor: '#512da8',
                        borderWidth: 1,
                        borderRadius: 4,
                        yAxisID: 'y',
                        order: 2
                    },
                    {
                        label: 'Churn 비율 (%)',
                        data: topCountries.map(d => d.churnRate),
                        backgroundColor: 'transparent',
                        borderColor: '#ff6b35',
                        borderWidth: 3,
                        yAxisID: 'y1',
                        type: 'line',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#ff6b35',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            afterBody: function(context) {
                                const dataIndex = context[0].dataIndex;
                                const country = topCountries[dataIndex];
                                return [
                                    `전체 유저: ${country.totalUsers.toLocaleString()}명`,
                                    `Churn 비율: ${country.churnRate.toFixed(2)}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '국가',
                            font: { size: 12 }
                        },
                        ticks: {
                            font: { size: 11 }
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Churn 수 (명)',
                            font: { size: 12 }
                        },
                        ticks: {
                            font: { size: 11 }
                        },
                        grid: {
                            color: 'rgba(25, 118, 210, 0.1)',
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Churn 비율 (%)',
                            font: { size: 12 }
                        },
                        ticks: {
                            font: { size: 11 }
                        },
                        grid: {
                            color: 'rgba(255, 107, 53, 0.1)',
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
        
        console.log('Real data chart created successfully!');
        
    } catch (error) {
        console.error('Error creating country ranking chart:', error);
        const container = document.getElementById('country-ranking');
        if (container) {
            container.innerHTML = '<p class="error">차트 생성 중 오류가 발생했습니다: ' + error.message + '</p>';
        }
    }
};

// 테이블 업데이트
const updateTable = () => {
    const tbody = document.getElementById('table-body');
    
    // 디버깅 로그 추가
    console.log('updateTable called:', {
        currentPage,
        filteredDataLength: filteredData ? filteredData.length : 0,
        itemsPerPage,
        allDataLength: allData ? allData.length : 0
    });
    
    // 데이터가 비어있는 경우 처리
    if (!filteredData || filteredData.length === 0) {
        console.log('No filtered data available');
        console.log('All data:', allData);
        console.log('Filtered data:', filteredData);
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">데이터가 없습니다.</td></tr>';
        
        // 페이지네이션 업데이트
        document.getElementById('page-info').textContent = '0 / 0';
        document.getElementById('prev-page').disabled = true;
        document.getElementById('next-page').disabled = true;
        return;
    }
    
    // 현재 페이지가 유효한지 확인하고 조정
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        console.log(`Current page ${currentPage} is beyond total pages ${totalPages}, resetting to page 1`);
        currentPage = 1;
    }
    
    // 첫 번째 페이지에서 데이터가 없으면 강제로 첫 번째 페이지 데이터 표시
    let startIndex = (currentPage - 1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;
    let pageData = filteredData.slice(startIndex, endIndex);
    
    // 첫 번째 페이지에서 데이터가 없고, 전체 데이터가 있는 경우 강제로 첫 번째 페이지 표시
    if (pageData.length === 0 && currentPage === 1 && filteredData.length > 0) {
        console.log('First page has no data but filtered data exists, forcing first page display');
        startIndex = 0;
        endIndex = Math.min(itemsPerPage, filteredData.length);
        pageData = filteredData.slice(startIndex, endIndex);
        console.log('Forced first page data:', {
            startIndex,
            endIndex,
            pageDataLength: pageData.length,
            firstUser: pageData[0] ? pageData[0].user_name : 'none'
        });
    }
    
    console.log('Page data calculation:', {
        startIndex,
        endIndex,
        pageDataLength: pageData.length,
        firstUser: pageData[0] ? pageData[0].user_name : 'none',
        totalPages,
        currentPage
    });
    
    // 현재 페이지에 데이터가 없는 경우 처리
    if (pageData.length === 0) {
        if (currentPage > 1) {
            // 다른 페이지에서 데이터가 없을 때는 첫 번째 페이지로 이동
            console.log('No data on current page, moving to first page');
            currentPage = 1;
            updateTable();
            return;
        } else {
            // 첫 번째 페이지에서 데이터가 없을 때는 빈 테이블 표시
            console.log('No data on first page');
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">현재 페이지에 데이터가 없습니다.</td></tr>';
            
            // 페이지네이션 업데이트
            document.getElementById('page-info').textContent = `${currentPage} / ${totalPages}`;
            document.getElementById('prev-page').disabled = true;
            document.getElementById('next-page').disabled = totalPages <= 1;
            return;
        }
    }

    tbody.innerHTML = '';

    pageData.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.user_id}</td>
            <td class="plan-${user.plan.toLowerCase()}">${user.plan}</td>
            <td>${formatNumber(user.generated_videos)}</td>
            <td>${user.country}</td>
            <td>${formatDate(user.last_video_date)}</td>
            <td>${formatDate(user.churn_date)}</td>
            <td>${formatDate(user.subscription_end_date)}</td>
            <td class="status-${user.payment_status.toLowerCase()}">${user.payment_status}</td>
        `;
        tbody.appendChild(row);
    });

    // 페이지네이션 업데이트
    document.getElementById('page-info').textContent = `${currentPage} / ${totalPages}`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
    
    console.log('Table updated successfully:', {
        rowsAdded: pageData.length,
        totalPages,
        currentPage
    });
};

// 필터 버튼 이벤트 설정
const setupFilterButtons = () => {
    console.log('Setting up filter buttons...'); // 디버깅용
    
    // 필터 버튼 클릭 이벤트
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const column = btn.dataset.filter;
            let filterType = 'text';
            
            console.log('Filter button clicked:', column); // 디버깅용
            
            // 컬럼별 필터 타입 설정
            if (column === 'user_id') {
                filterType = 'text';
            } else if (column === 'generated_videos') {
                filterType = 'range';
            } else if (column === 'last_video_date' || column === 'churn_date') {
                filterType = 'date';
            } else {
                filterType = 'select';
            }
            
            console.log('Filter type:', filterType); // 디버깅용
            showFilterPopup(column, filterType);
        });
    });
    
    // 팝업 닫기 버튼
    const closeBtn = document.getElementById('close-filter');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideFilterPopup);
        console.log('Close button event listener added'); // 디버깅용
    } else {
        console.error('Close button not found!'); // 디버깅용
    }
    
    // 팝업 배경 클릭 시 닫기
    const popup = document.getElementById('filter-popup');
    if (popup) {
        popup.addEventListener('click', (e) => {
            if (e.target.id === 'filter-popup') {
                hideFilterPopup();
            }
        });
        console.log('Popup background click event added'); // 디버깅용
    } else {
        console.error('Filter popup not found!'); // 디버깅용
    }
    
    // 필터 적용 버튼
    const applyBtn = document.getElementById('apply-filter-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilter);
        console.log('Apply button event listener added'); // 디버깅용
    } else {
        console.error('Apply button not found!'); // 디버깅용
    }
    
    // 필터 초기화 버튼
    const clearBtn = document.getElementById('clear-filter-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            console.log('Clear button clicked'); // 디버깅용
            delete activeFilters[currentFilterColumn];
            applyFilters();
            hideFilterPopup();
        });
        console.log('Clear button event listener added'); // 디버깅용
    } else {
        console.error('Clear button not found!'); // 디버깅용
    }
    
    console.log('Filter button setup complete'); // 디버깅용
};

// 디바운스 함수
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// 페이지네이션 이벤트
const setupPagination = () => {
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateTable();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateTable();
        }
    });
};

// 차트 업데이트 함수
const updateCharts = () => {
    console.log('=== updateCharts called ===');
    console.log('Current statistics filtered data:', {
        length: statisticsFilteredData ? statisticsFilteredData.length : 0,
        sample: statisticsFilteredData ? statisticsFilteredData.slice(0, 3) : []
    });
    
    // Statistics 뷰가 활성화되어 있는지 확인
    const statisticsView = document.getElementById('statistics-view');
    const isStatisticsActive = statisticsView && statisticsView.classList.contains('active');
    
    console.log('Statistics view status:', {
        element: !!statisticsView,
        isActive: isStatisticsActive,
        classList: statisticsView ? statisticsView.className : 'N/A'
    });
    
    if (!isStatisticsActive) {
        console.log('Statistics view is not active, skipping chart creation');
        return;
    }
    
    console.log('Statistics view is active, creating charts...');
    
    // 기존 Chart.js 차트 제거
    if (countryRankingChart) {
        console.log('Destroying existing countryRankingChart');
        countryRankingChart.destroy();
        countryRankingChart = null;
    }
    if (planStackedChart) {
        console.log('Destroying existing planStackedChart');
        planStackedChart.destroy();
        planStackedChart = null;
    }
    
    // 전역 차트 변수도 정리
    if (window.planAvgVideosChart) {
        console.log('Destroying existing planAvgVideosChart');
        window.planAvgVideosChart.destroy();
        window.planAvgVideosChart = null;
    }
    if (window.scatterPlotChart) {
        console.log('Destroying existing scatterPlotChart');
        window.scatterPlotChart.destroy();
        window.scatterPlotChart = null;
    }
    
    // D3 차트 컨테이너 초기화 (존재하는 컨테이너만)
    const countryRankingContainer = document.getElementById('country-ranking');

    if (countryRankingContainer) {
        console.log('Clearing country-ranking container');
        countryRankingContainer.innerHTML = '';
    }
    
    // 새 차트 생성 (존재하는 차트만)
    try {
        console.log('Starting chart creation...');
        

        
        createPlanStackedChart();
        console.log('✓ Plan stacked chart created');
        
        createCountryRanking();
        console.log('✓ Country ranking chart created');
        
        createPlanAvgVideosChart();
        console.log('✓ Plan avg videos chart created');
        
        createScatterPlot();
        console.log('✓ Scatter plot created');
        
        console.log('=== All charts created successfully ===');
    } catch (error) {
        console.error('Error creating charts:', error);
    }
};

// 대시보드 전체 업데이트
const updateDashboard = () => {
    updateKPIs();
    updateCharts();
    updateTable();
};

// 세그먼트 컨트롤 이벤트 설정
const setupSegmentControl = () => {
    const segmentBtns = document.querySelectorAll('.segment-btn');
    const viewContents = document.querySelectorAll('.view-content');
    
    // 저장된 뷰 상태 복원
    const savedView = localStorage.getItem('dashboardView') || 'table';
    
    segmentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetView = btn.dataset.view;
            
            // 모든 세그먼트 컨트롤의 모든 버튼에서 active 클래스 제거
            document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
            
            // 클릭된 버튼과 동일한 data-view를 가진 모든 버튼에 active 클래스 추가
            document.querySelectorAll(`[data-view="${targetView}"]`).forEach(b => b.classList.add('active'));
            
            // 모든 뷰 숨기기
            viewContents.forEach(view => view.classList.remove('active'));
            // 타겟 뷰만 표시
            document.getElementById(`${targetView}-view`).classList.add('active');
            
            // 뷰 상태 저장
            localStorage.setItem('dashboardView', targetView);
            
            // Statistics 뷰로 전환 시 차트 업데이트
            if (targetView === 'statistics') {
                console.log('Switching to Statistics view, updating charts...');
                // 즉시 차트 업데이트 시도
                updateCharts();
                // 추가로 약간의 지연 후에도 시도 (DOM 렌더링 완료 후)
                setTimeout(() => {
                    console.log('Delayed chart update after Statistics view switch...');
                    updateCharts();
                }, 500);
            }
        });
    });
    
    // 저장된 뷰 상태로 초기화
    const targetBtn = document.querySelector(`[data-view="${savedView}"]`);
    const targetView = document.getElementById(`${savedView}-view`);
    
    if (targetBtn && targetView) {
        // 모든 세그먼트 컨트롤의 모든 버튼에서 active 클래스 제거
        document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        
        // 저장된 뷰와 일치하는 모든 버튼에 active 클래스 추가
        document.querySelectorAll(`[data-view="${savedView}"]`).forEach(b => b.classList.add('active'));
        
        viewContents.forEach(view => view.classList.remove('active'));
        targetView.classList.add('active');
        
        // Statistics 뷰인 경우 차트 업데이트
        if (savedView === 'statistics') {
            console.log('Restoring Statistics view, updating charts...');
            // 즉시 차트 업데이트 시도
            updateCharts();
            // 추가로 약간의 지연 후에도 시도 (DOM 렌더링 완료 후)
            setTimeout(() => {
                console.log('Delayed chart update after Statistics view restoration...');
                updateCharts();
            }, 500);
        }
    }
};

// 유저 영상 목록 모달 관련 함수들
const generateUserVideos = (userId, userName) => {
    const videoCount = Math.floor(seededRandom(userId.charCodeAt(0)) * 20) + 5; // 5-25개 영상
    const videos = [];
    
    const sourceLanguages = ['한국어', '영어', '일본어', '중국어', '스페인어', '프랑스어', '독일어', '이탈리아어', '포르투갈어', '러시아어'];
    const targetLanguages = ['한국어', '영어', '일본어', '중국어', '스페인어', '프랑스어', '독일어', '이탈리아어', '포르투갈어', '러시아어'];
    
    for (let i = 1; i <= videoCount; i++) {
        const videoDate = new Date();
        videoDate.setDate(videoDate.getDate() - Math.floor(seededRandom(i) * 365)); // 최근 1년 내
        
        const durations = [15, 30, 45, 60, 90, 120];
        const duration = durations[Math.floor(seededRandom(i * 3) * durations.length)];
        
        const sourceLanguage = sourceLanguages[Math.floor(seededRandom(i * 5) * sourceLanguages.length)];
        const targetLanguage = targetLanguages[Math.floor(seededRandom(i * 6) * targetLanguages.length)];
        
        videos.push({
            id: `video_${userId}_${i}`,
            title: `${userName}의 영상 ${i}`,
            date: videoDate,
            status: 'completed',
            duration: duration,
            sourceLanguage: sourceLanguage,
            targetLanguage: targetLanguage
        });
    }
    
    return videos.sort((a, b) => b.date - a.date); // 최신순 정렬 (1번이 가장 최신)
};

const showUserVideosModal = (userId, userName) => {
    const modal = document.getElementById('user-videos-modal');
    const modalUserName = document.getElementById('modal-user-name');
    const modalUserPlan = document.getElementById('modal-user-plan');
    const modalUserChurnReason = document.getElementById('modal-user-churn-reason');
    const modalUserCountry = document.getElementById('modal-user-country');
    const totalVideosCount = document.getElementById('total-videos-count');
    const videosList = document.getElementById('videos-list');
    
    // 모든 필요한 요소가 있는지 확인
    if (!modal || !modalUserName || !modalUserPlan || !modalUserChurnReason || !modalUserCountry || !totalVideosCount || !videosList) {
        console.error('Required modal elements not found:', {
            modal: !!modal,
            modalUserName: !!modalUserName,
            modalUserPlan: !!modalUserPlan,
            modalUserChurnReason: !!modalUserChurnReason,
            modalUserCountry: !!modalUserCountry,
            totalVideosCount: !!totalVideosCount,
            videosList: !!videosList
        });
        return;
    }
    
    // 사용자 데이터 찾기
    const userData = allData.find(user => user.user_id === userId);
    
    // 모달 헤더 정보 설정
    modalUserName.textContent = userName;
    modalUserPlan.textContent = userData ? userData.plan : 'Unknown';
    modalUserChurnReason.textContent = userData ? userData.payment_status : 'Unknown';
    modalUserCountry.textContent = userData ? userData.country : 'Unknown';
    
    // 유저의 영상 목록 생성
    const videos = generateUserVideos(userId, userName);
    totalVideosCount.textContent = videos.length;
    
    // 영상 목록 렌더링
    videosList.innerHTML = '';
                 videos.forEach((video, index) => {
                 const videoItem = document.createElement('div');
                 videoItem.className = 'video-item';
                 videoItem.innerHTML = `
                     <div class="video-header">
                         <h4 class="video-title">${index + 1}번. ${video.title}</h4>
                         <span class="video-status ${video.status}">${video.status}</span>
                     </div>
                     <div class="video-details">
                         <div class="video-detail">
                             <span class="video-detail-label">생성일</span>
                             <span class="video-detail-value">${formatDate(video.date)}</span>
                         </div>
                         <div class="video-detail">
                             <span class="video-detail-label">길이</span>
                             <span class="video-detail-value">${video.duration}초</span>
                         </div>
                         <div class="video-detail">
                             <span class="video-detail-label">소스언어</span>
                             <span class="video-detail-value">${video.sourceLanguage}</span>
                         </div>
                         <div class="video-detail">
                             <span class="video-detail-label">타겟언어</span>
                             <span class="video-detail-value">${video.targetLanguage}</span>
                         </div>
                     </div>
                 `;
                 videosList.appendChild(videoItem);
             });
    
    // 모달 표시
    modal.classList.add('show');
};

const hideUserVideosModal = () => {
    const modal = document.getElementById('user-videos-modal');
    if (modal) {
        modal.classList.remove('show');
    } else {
        console.warn('User videos modal not found when trying to hide');
    }
};

const setupUserVideosModal = () => {
    // 모달 닫기 버튼 이벤트
    const closeBtn = document.querySelector('#user-videos-modal .close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideUserVideosModal);
        console.log('Close button event listener added');
    } else {
        console.warn('Close button for user videos modal not found');
    }
    
    // 모달 배경 클릭 시 닫기
    const modal = document.getElementById('user-videos-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideUserVideosModal();
            }
        });
    } else {
        console.warn('User videos modal not found');
    }
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideUserVideosModal();
        }
    });
};



// 테이블 행 클릭 이벤트 수정
const setupTableRowClick = () => {
    const table = document.getElementById('churn-table');
    if (!table) return;
    
    table.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row || row.cells.length === 0) return;
        
        // 헤더 행 클릭 시 무시
        if (row.parentElement.tagName === 'THEAD') return;
        
        // 유저 ID 가져오기 (사용자명 컬럼이 제거되어 인덱스 조정)
        const userId = row.cells[0].textContent.trim();
        const userName = userId; // 사용자명 대신 ID를 사용
        
        // 모달 표시
        showUserVideosModal(userId, userName);
    });
};

// 플랜별 평균 영상 생성개수 차트
const createPlanAvgVideosChart = () => {
    try {
        console.log('Creating plan avg videos chart...');
        
        const container = document.getElementById('plan-avg-videos-chart');
        if (!container) {
            console.error('Plan avg videos chart container not found');
            return;
        }
        
        const ctx = container.getContext('2d');
        
        // 기존 차트가 있으면 제거
        if (window.planAvgVideosChart) {
            console.log('Destroying existing planAvgVideosChart');
            window.planAvgVideosChart.destroy();
        }
        
        // 플랜별 평균 영상 생성개수 계산
        const planData = {};
        statisticsFilteredData.forEach(user => {
            if (!planData[user.plan]) {
                planData[user.plan] = { total: 0, count: 0 };
            }
            planData[user.plan].total += user.generated_videos;
            planData[user.plan].count += 1;
        });
        
        console.log('Plan data aggregated:', planData);
        
        // 플랜 순서를 Creator, Team, Enterprise 순으로 고정
        const planOrder = ['Creator', 'Team', 'Enterprise'];
        const plans = planOrder.filter(plan => planData[plan]); // 데이터가 있는 플랜만 필터링
        const avgVideos = plans.map(plan => 
            Math.round((planData[plan].total / planData[plan].count) * 10) / 10
        );
        
        console.log('Plans and average videos:', { plans, avgVideos });
        
        if (plans.length === 0) {
            console.warn('No plan data available for chart');
            container.innerHTML = '<p class="no-data">데이터가 없습니다.</p>';
            return;
        }
        
        console.log('Creating new plan avg videos chart...');
        window.planAvgVideosChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: plans,
                datasets: [{
                    label: '평균 영상 생성개수',
                    data: avgVideos,
                    backgroundColor: plans.map(plan => colors[plan]),
                    borderColor: plans.map(plan => colors[plan]),
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y}개`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '평균 영상 생성개수',
                            font: {
                                size: 12
                            }
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '플랜',
                            font: {
                                size: 12
                            }
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
        
        console.log('Plan avg videos chart created successfully');
    } catch (error) {
        console.error('Error creating plan avg videos chart:', error);
        const container = document.getElementById('plan-avg-videos-chart');
        if (container) {
            container.innerHTML = '<p class="error">차트 생성 중 오류가 발생했습니다.</p>';
        }
    }
};

// 사이드바 토글 기능
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    // 사이드바 토글 버튼 클릭 이벤트
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
        
        // 아이콘 방향 변경 (원래 아이콘)
        if (sidebar.classList.contains('collapsed')) {
            sidebarToggle.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="6" width="18" height="12" rx="2" ry="2"/>
                    <line x1="15" y1="6" x2="15" y2="18"/>
                </svg>
            `;
        } else {
            sidebarToggle.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="6" width="18" height="12" rx="2" ry="2"/>
                    <line x1="9" y1="6" x2="9" y2="18"/>
                </svg>
            `;
        }
    });
    
    // 네비게이션 아이템 클릭 이벤트
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 모든 아이템에서 active 클래스 제거
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // 클릭된 아이템에 active 클래스 추가
            this.classList.add('active');
            
            // 모든 뷰 숨기기
            const allViews = document.querySelectorAll('.view-content');
            allViews.forEach(view => view.classList.remove('active'));
            
            // 선택된 대시보드에 따라 뷰 전환
            const dashboard = this.getAttribute('data-dashboard');
            const churnSegmentControl = document.getElementById('churn-segment-control');
            const churnSegmentControlStats = document.getElementById('churn-segment-control-stats');
            
            if (dashboard === 'home') {
                document.getElementById('home-view').classList.add('active');
                // Home 페이지에서는 세그먼트 컨트롤 숨기기
                if (churnSegmentControl) {
                    churnSegmentControl.style.display = 'none';
                }
                if (churnSegmentControlStats) {
                    churnSegmentControlStats.style.display = 'none';
                }
                console.log('Selected dashboard: home');
            } else if (dashboard === 'churn') {
                document.getElementById('table-view').classList.add('active');
                // Churn 페이지에서는 세그먼트 컨트롤 보이기
                if (churnSegmentControl) {
                    churnSegmentControl.style.display = 'flex';
                }
                if (churnSegmentControlStats) {
                    churnSegmentControlStats.style.display = 'flex';
                }
                console.log('Selected dashboard: churn');
            }
        });
    });
    
    // 버튼 클릭 이벤트
    const viewAllBtn = document.querySelector('.btn-primary');
    const activeBtn = document.querySelector('.btn-secondary');
    
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function() {
            console.log('View All clicked');
            // 여기에 View All 기능을 추가할 수 있습니다
        });
    }
    
    if (activeBtn) {
        activeBtn.addEventListener('click', function() {
            console.log('Active clicked');
            // 여기에 Active 필터 기능을 추가할 수 있습니다
        });
    }
});

// 사이드바 축소 시 스타일 적용을 위한 CSS 클래스 추가
const style = document.createElement('style');
style.textContent = `
    .sidebar.collapsed {
        width: 80px;
    }
    
    .sidebar.collapsed .app-name,
    .sidebar.collapsed .nav-item span,
    .sidebar.collapsed .app-icon,
    .sidebar.collapsed .logo-image {
        display: none;
    }
    
    .sidebar.collapsed .nav-section-title {
        visibility: hidden;
        height: 32px;
        margin-bottom: 8px;
    }
    
    .sidebar.collapsed .nav-item {
        justify-content: center;
        padding: 12px;
        margin-top: 0;
        position: relative;
        top: 0;
    }
    
    .sidebar.collapsed .nav-section {
        margin-bottom: 32px;
        position: relative;
        top: 0;
    }
    
    .sidebar.collapsed .nav-section:last-child {
        margin-bottom: 0;
    }
    
    .sidebar.collapsed .sidebar-nav {
        padding: 24px 0;
        position: relative;
        top: 0;
        transform: none;
    }
    
    .sidebar.collapsed .nav-section {
        margin-bottom: 32px;
        position: relative;
        top: 0;
        transform: none;
    }
    
    .sidebar.collapsed .nav-item {
        justify-content: center;
        padding: 12px;
        margin-top: 0;
        position: relative;
        top: 0;
        transform: none;
    }
    
    .sidebar.collapsed .nav-icon {
        margin: 0;
    }
    
    .sidebar.collapsed .sidebar-header {
        padding: 24px 0;
        border-bottom: none;
    }
    
    .main-content.expanded {
        margin-left: 80px;
    }
    
    .sidebar.collapsed .sidebar-toggle {
        right: 36px;
        top: 24px;
    }
`;
document.head.appendChild(style);

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting initialization...');
    
    // 데이터 상태 확인
    console.log('Data status check:', {
        allDataLength: allData ? allData.length : 'undefined',
        filteredDataLength: filteredData ? filteredData.length : 'undefined',
        currentPage,
        itemsPerPage
    });
    
    // 데이터 초기화
    console.log('Initializing data...');
    const sampleDataResult = generateSampleData();
    allData = sampleDataResult.data;
    filteredData = [...allData];
    statisticsFilteredData = [...allData];
    countryTotalUsers = sampleDataResult.countryTotalUsers;
    
    console.log('Data initialized:', {
        allDataLength: allData.length,
        filteredDataLength: filteredData.length,
        statisticsFilteredDataLength: statisticsFilteredData.length,
        countryTotalUsers: countryTotalUsers
    });
    
    // 데이터 샘플 확인
    if (allData && allData.length > 0) {
        console.log('Sample data item:', allData[0]);
        console.log('First 3 items:', allData.slice(0, 3));
    }
    
    // 세그먼트 컨트롤 이벤트 설정
    setupSegmentControl();
    
    // 필터 버튼 이벤트 설정
    setupFilterButtons();
    setupPagination();
    
    // 기간 필터 이벤트 설정
    setupDateFilter();
    
    // 유저 영상 목록 모달 이벤트 설정
    setupUserVideosModal();
    
    // 테이블 행 클릭 이벤트 설정
    setupTableRowClick();
    
    // 초기 날짜 설정 (최근 30일)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    if (startDateInput && endDateInput) {
        startDateInput.value = startDate.toISOString().split('T')[0];
        endDateInput.value = endDate.toISOString().split('T')[0];
    }
    
    // 초기 데이터 설정 및 테이블 업데이트
    console.log('Final data setup:', {
        allDataLength: allData.length,
        filteredDataLength: filteredData.length,
        statisticsFilteredDataLength: statisticsFilteredData.length,
        countryTotalUsers: countryTotalUsers,
        currentPage,
        itemsPerPage
    });
    
    // 즉시 테이블 업데이트
    console.log('About to call updateTable...');
    console.log('Data before updateTable:', {
        allDataLength: allData.length,
        filteredDataLength: filteredData.length,
        currentPage
    });
    updateTable();
    
    // KPI 업데이트는 약간의 지연 후
    setTimeout(() => {
        console.log('About to call updateKPIs...');
        updateKPIs();
    }, 100);
    
    // Statistics 뷰가 활성화되어 있다면 차트도 생성
    setTimeout(() => {
        const activeView = document.querySelector('.view-content.active');
        if (activeView && activeView.id === 'statistics-view') {
            console.log('Statistics view is active on init, creating charts...');
            updateCharts();
        }
    }, 200);
    
    // 창 크기 변경 시 차트 재조정
    window.addEventListener('resize', () => {
        const activeView = document.querySelector('.view-content.active');
        if (activeView && activeView.id === 'statistics-view') {
            setTimeout(() => {
                updateCharts();
            }, 100);
        }
    });
    
    console.log('Initialization complete');
}); 