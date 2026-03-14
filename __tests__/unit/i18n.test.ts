import { describe, it, expect } from 'vitest';
import { createT, translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

describe('createT — Korean locale', () => {
  const t = createT('ko');

  it('should return app title', () => {
    expect(t('app.title')).toBe('BITE Log');
  });

  it('should return Korean greeting', () => {
    expect(t('app.greeting')).toBe('바이트로그');
  });

  it('should return Korean navigation labels', () => {
    expect(t('nav.home')).toBe('홈');
    expect(t('nav.feed')).toBe('피드');
    expect(t('nav.record')).toBe('기록');
    expect(t('nav.stats')).toBe('통계');
    expect(t('nav.settings')).toBe('설정');
    expect(t('nav.ai')).toBe('AI');
  });

  it('should return Korean record screen labels', () => {
    expect(t('record.title')).toBe('조과 기록');
    expect(t('record.save')).toBe('저장');
    expect(t('record.date')).toBe('날짜');
    expect(t('record.species')).toBe('어종');
    expect(t('record.submit')).toBe('기록 저장');
  });

  it('should return Korean stats labels', () => {
    expect(t('stats.title')).toBe('나의 통계');
    expect(t('stats.totalTrips')).toBe('총 출조');
    expect(t('stats.totalCatch')).toBe('총 조과');
  });

  it('should return Korean ranking labels', () => {
    expect(t('ranking.title')).toBe('랭킹');
    expect(t('ranking.catchKing')).toBe('조과왕');
    expect(t('ranking.sizeKing')).toBe('대어왕');
  });

  it('should return Korean period labels', () => {
    expect(t('period.week')).toBe('1주');
    expect(t('period.month')).toBe('1개월');
    expect(t('period.all')).toBe('전체');
  });

  it('should return Korean theme labels', () => {
    expect(t('theme.light')).toBe('라이트');
    expect(t('theme.dark')).toBe('다크');
    expect(t('theme.system')).toBe('시스템');
  });

  it('should return Korean common action labels', () => {
    expect(t('common.cancel')).toBe('취소');
    expect(t('common.delete')).toBe('삭제');
    expect(t('common.edit')).toBe('수정');
    expect(t('common.confirm')).toBe('확인');
  });

  it('should return Korean home screen strings', () => {
    expect(t('home.totalCatch')).toBe('총 조과');
    expect(t('home.thisMonth')).toBe('이번 달');
    expect(t('home.noCatches')).toBe('아직 조과 기록이 없습니다');
  });

  it('should return Korean season labels', () => {
    expect(t('season.title')).toBe('시즌 예측');
    expect(t('season.analyze')).toBe('AI 시즌 분석');
  });

  it('should return Korean alert labels', () => {
    expect(t('alerts.title')).toBe('맞춤 오픈런 알림');
    expect(t('alerts.addBtn')).toBe('구독 추가');
  });

  it('should return Korean viral gear labels', () => {
    expect(t('viralGear.title')).toBe('바이럴 채비 랭킹');
    expect(t('viralGear.refresh')).toBe('새로고침');
  });
});

describe('createT — English locale', () => {
  const t = createT('en');

  it('should return English app title', () => {
    expect(t('app.title')).toBe('BITE Log');
  });

  it('should return English greeting', () => {
    expect(t('app.greeting')).toBe('BITE Log');
  });

  it('should return English navigation labels', () => {
    expect(t('nav.home')).toBe('Home');
    expect(t('nav.feed')).toBe('Feed');
    expect(t('nav.record')).toBe('Record');
    expect(t('nav.stats')).toBe('Stats');
    expect(t('nav.settings')).toBe('Settings');
  });

  it('should return English record labels', () => {
    expect(t('record.title')).toBe('Catch Record');
    expect(t('record.save')).toBe('Save');
    expect(t('record.date')).toBe('Date');
    expect(t('record.species')).toBe('Species');
    expect(t('record.submit')).toBe('Save Record');
  });

  it('should return English stats labels', () => {
    expect(t('stats.title')).toBe('My Stats');
    expect(t('stats.totalTrips')).toBe('Total Trips');
    expect(t('stats.totalCatch')).toBe('Total Catch');
  });

  it('should return English ranking labels', () => {
    expect(t('ranking.title')).toBe('Ranking');
    expect(t('ranking.catchKing')).toBe('Most Caught');
    expect(t('ranking.sizeKing')).toBe('Biggest Fish');
  });

  it('should return English period labels', () => {
    expect(t('period.week')).toBe('1W');
    expect(t('period.month')).toBe('1M');
    expect(t('period.all')).toBe('All');
  });

  it('should return English theme labels', () => {
    expect(t('theme.light')).toBe('Light');
    expect(t('theme.dark')).toBe('Dark');
    expect(t('theme.system')).toBe('System');
  });

  it('should return English common action labels', () => {
    expect(t('common.cancel')).toBe('Cancel');
    expect(t('common.delete')).toBe('Delete');
    expect(t('common.edit')).toBe('Edit');
  });

  it('should return English season labels', () => {
    expect(t('season.title')).toBe('AI Season Forecast');
    expect(t('season.analyze')).toBe('AI Season Analysis');
  });

  it('should return English alert labels', () => {
    expect(t('alerts.title')).toBe('Custom Open-Run Alerts');
    expect(t('alerts.addBtn')).toBe('Add Subscription');
  });

  it('should return English viral gear labels', () => {
    expect(t('viralGear.title')).toBe('Viral Gear Ranking');
    expect(t('viralGear.refresh')).toBe('Refresh');
  });
});

describe('createT — key fallback behavior', () => {
  it('should return the key itself when key is not found (ko)', () => {
    const t = createT('ko');
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('should return the key itself when key is not found (en)', () => {
    const t = createT('en');
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('should handle deeply nested missing key', () => {
    const t = createT('ko');
    expect(t('nav.doesNotExist')).toBe('nav.doesNotExist');
  });

  it('should handle single-level missing key', () => {
    const t = createT('en');
    expect(t('missingTopLevel')).toBe('missingTopLevel');
  });
});

describe('translations object — structure validation', () => {
  const locales: Locale[] = ['ko', 'en'];
  const requiredTopKeys = ['app', 'nav', 'home', 'record', 'stats', 'ranking', 'period', 'theme', 'common'];

  for (const locale of locales) {
    it(`${locale} should have all required top-level keys`, () => {
      const trans = translations[locale];
      for (const key of requiredTopKeys) {
        expect(trans).toHaveProperty(key);
      }
    });

    it(`${locale} nav should have all navigation keys`, () => {
      const nav = translations[locale].nav;
      expect(nav).toHaveProperty('home');
      expect(nav).toHaveProperty('feed');
      expect(nav).toHaveProperty('record');
      expect(nav).toHaveProperty('stats');
      expect(nav).toHaveProperty('settings');
      expect(nav).toHaveProperty('ai');
    });

    it(`${locale} record should have required form keys`, () => {
      const record = translations[locale].record;
      expect(record).toHaveProperty('title');
      expect(record).toHaveProperty('date');
      expect(record).toHaveProperty('species');
      expect(record).toHaveProperty('submit');
    });
  }

  it('ko and en should have the same structure', () => {
    const koKeys = Object.keys(translations.ko).sort();
    const enKeys = Object.keys(translations.en).sort();
    expect(koKeys).toEqual(enKeys);
  });

  it('ko and en should NOT have identical values (they are different languages)', () => {
    // nav.home: '홈' vs 'Home'
    expect(translations.ko.nav.home).not.toBe(translations.en.nav.home);
    // stats.title: '나의 통계' vs 'My Stats'
    expect(translations.ko.stats.title).not.toBe(translations.en.stats.title);
  });
});

describe('createT — locale independence', () => {
  it('ko and en translators should not interfere with each other', () => {
    const tKo = createT('ko');
    const tEn = createT('en');

    expect(tKo('nav.home')).toBe('홈');
    expect(tEn('nav.home')).toBe('Home');
    // Calling one should not affect the other
    expect(tKo('nav.home')).toBe('홈');
    expect(tEn('nav.home')).toBe('Home');
  });

  it('multiple calls with same key should return consistent results', () => {
    const t = createT('ko');
    const result1 = t('record.title');
    const result2 = t('record.title');
    expect(result1).toBe(result2);
    expect(result1).toBe('조과 기록');
  });
});
