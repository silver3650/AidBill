// src/hooks/useAutoSave.js
import { useState, useEffect } from 'react';

export function useAutoSave(storageKey, initialValue) {
  // 1. 초기 상태를 설정할 때, 로컬 스토리지에 저장된 데이터가 있는지 먼저 확인합니다.
  const [state, setState] = useState(() => {
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData !== null) {
        return JSON.parse(savedData); // 쓰다 만 데이터가 있으면 복원
      }
    } catch (error) {
      console.error('임시 저장 데이터 복원 실패:', error);
    }
    return initialValue; // 없으면 기본값 사용
  });

  // 2. state(데이터)가 한 글자라도 바뀔 때마다 로컬 스토리지에 실시간으로 덮어씁니다.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('임시 저장 실패:', error);
    }
  }, [storageKey, state]);

  // 3. 폼 제출이 완벽하게 끝났을 때(저장 완료) 찌꺼기 데이터를 지우는 함수입니다.
  const clearSavedState = () => {
    localStorage.removeItem(storageKey);
    setState(initialValue);
  };

  // 기존 useState처럼 쓸 수 있게 반환하되, 초기화 함수를 하나 더 보너스로 줍니다.
  return [state, setState, clearSavedState];
}