import type { DiagnosisResult } from "@/lib/openai/schemas";

const URGENCY_STYLES: Record<DiagnosisResult["urgency"], string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

export function DiagnosisResultView({ result }: { result: DiagnosisResult }) {
  return (
    <div className="space-y-4">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${URGENCY_STYLES[result.urgency]}`}
      >
        {`Urgency: ${result.urgency}`}
      </span>

      <p className="text-sm text-gray-700 dark:text-gray-300">{result.overall_assessment}</p>

      {result.detected_issues.length > 0 && (
        <ul className="space-y-2">
          {result.detected_issues.map((issue, i) => (
            <li key={i} className="rounded-md border border-gray-200 p-3">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {`${issue.issue} (${Math.round(issue.confidence * 100)}% confidence)`}
              </p>
              <ul className="mt-1 list-disc pl-5 text-sm text-gray-600 dark:text-gray-400">
                {issue.symptoms_observed.map((symptom, j) => (
                  <li key={j}>{symptom}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <div>
        <h4 className="font-medium text-gray-900 dark:text-gray-100">Suggested treatment</h4>
        <p className="text-sm text-gray-700 dark:text-gray-300">{result.suggested_treatment}</p>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        This is an AI-generated estimate, not a substitute for professional plant diagnosis —
        especially for high-value or valuable plants.
      </p>
    </div>
  );
}
