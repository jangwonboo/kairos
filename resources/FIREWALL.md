# Kairos — IT팀 방화벽 허용 요청

이 앱이 정상 동작하려면 아래 도메인에 대한 **443/TCP outbound** 연결이 필요합니다.

## 허용 필요 도메인

| 도메인 | 용도 |
|---|---|
| `api.unsplash.com` | 이미지 검색 API |
| `images.unsplash.com` | 이미지 다운로드 |
| `api.pexels.com` | 이미지 검색 API (폴백) |
| `images.pexels.com` | 이미지 다운로드 |
| `pixabay.com` | 이미지 검색 + 다운로드 (폴백) |
| `cdn.pixabay.com` | 이미지 CDN |
| `commons.wikimedia.org` | 이미지 검색 + 다운로드 (최후 수단, 키 불필요) |
| `upload.wikimedia.org` | 이미지 CDN |

## 보안 사항

- 이 앱은 **inbound 연결을 수신하지 않습니다.**
- **텔레메트리, 사용 통계, 개인정보를 외부로 전송하지 않습니다.**
- 모든 통신은 **HTTPS (443/TCP) 표준 포트**만 사용합니다.
- WebSocket, 커스텀 포트, P2P 통신을 사용하지 않습니다.
- API 키는 OS Keychain (Windows Credential Manager)에 암호화 저장됩니다.

## 오프라인 환경

네트워크 접근이 불가능한 경우, 앱 설정에서 **오프라인 모드**를 활성화하면
번들된 로컬 배경 이미지만 사용합니다.
