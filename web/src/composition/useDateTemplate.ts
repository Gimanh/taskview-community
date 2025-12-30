type YearWithMoth = string;
type TaskCount = number;

export function useAnalyticsDateTemplate(startDate: Date, endDate: Date) {
    const currentDate = new Date(startDate);

    function dateToTemplateString(date: Date) {
        const diffInMs = endDate.getTime() - startDate.getTime();
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

        if (diffInDays <= 62) {
            return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } else {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
    }

    function fillTemplate() {
        const template: Record<YearWithMoth, TaskCount> = {};
        const diffInMs = endDate.getTime() - startDate.getTime();
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

        for (const key in template) {
            delete template[key];
        }

        const st = new Date(currentDate);
        const en = new Date(endDate);

        if (diffInDays <= 62) {
            while (st <= en) {
                template[dateToTemplateString(st)] = 0;
                st.setDate(st.getDate() + 1);
            }
        } else {
            while (st <= en) {
                template[dateToTemplateString(st)] = 0;
                st.setMonth(st.getMonth() + 1);
            }
        }

        return template;
    }

    return {
        fillTemplate,
        dateToTemplateString,
    };
}
