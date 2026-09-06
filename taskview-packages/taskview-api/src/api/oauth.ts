import TvApiBase from './base';
import type { AppResponse } from '@/api/base.types';
import type {
    OAuthConnectedApp,
    OAuthConsentRequest,
    OAuthConsentResponse,
} from './oauth.types';

export default class TvOAuth extends TvApiBase {
    protected moduleUrl = '/module/oauth';

    public async approveConsent(data: OAuthConsentRequest) {
        return this.request(
            this.$axios.post<AppResponse<OAuthConsentResponse>>(`${this.moduleUrl}/consent`, data)
        );
    }

    public async denyConsent(data: OAuthConsentRequest) {
        return this.request(
            this.$axios.post<AppResponse<OAuthConsentResponse>>(`${this.moduleUrl}/consent/deny`, data)
        );
    }

    public async fetchConnectedApps() {
        return this.request(
            this.$axios.get<AppResponse<OAuthConnectedApp[]>>(`${this.moduleUrl}/connected-apps`)
        );
    }

    public async revokeConnectedApp(grantId: number) {
        return this.request(
            this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}/connected-apps`, { data: { grantId } })
        );
    }
}
