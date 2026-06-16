"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;
  labels?: string[];
}

/** Step progress indicator for multi-step flows */
export default function ProgressBar({
  currentStep,
  totalSteps = 3,
  labels = ["Basic info", "Health", "Routine"],
}: ProgressBarProps) {
  const percent = (currentStep / totalSteps) * 100;

  return (
    <motion.div className="w-full" aria-label={`Step ${currentStep} of ${totalSteps}`}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-vital-text">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-vital-muted">{labels[currentStep - 1]}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-vital-border">
        <motion.div
          className="h-full rounded-full bg-vital-primary"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
      <ul className="mt-3 hidden gap-2 sm:flex">
        {labels.map((label, i) => {
          const stepNum = i + 1;
          const active = stepNum === currentStep;
          const done = stepNum < currentStep;
          return (
            <li
              key={label}
              className={`flex-1 rounded-md border px-2 py-1.5 text-center text-xs ${
                active
                  ? "border-vital-primary bg-vital-primary/10 text-vital-primary"
                  : done
                    ? "border-vital-primary/40 text-vital-muted"
                    : "border-vital-border text-vital-muted"
              }`}
            >
              {label}
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
