'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, LayoutDashboard, Map, ClipboardList, Users, MapPin, Smartphone } from 'lucide-react';

const STORAGE_KEY = 'fieldops-onboarding-v1';

const steps = [
  {
    icon: LayoutDashboard,
    color: 'blue' as const,
    title: 'Welcome to FieldOps 👋',
    description:
      'Your command center for managing field workers, jobs, and locations — all in one place. This 30-second tour will walk you through the key features.',
    tip: null,
  },
  {
    icon: Map,
    color: 'green' as const,
    title: 'Live Map',
    description:
      "Watch all your field workers move in real-time on an interactive map. See each worker's GPS location, current status, and when they were last active.",
    tip: 'Workers automatically share their location through the FieldOps mobile app.',
  },
  {
    icon: ClipboardList,
    color: 'yellow' as const,
    title: 'Jobs & Dispatch',
    description:
      'Create jobs, assign them to specific workers, and dispatch them with one click. Workers receive an instant notification on their phone.',
    tip: 'Job flow: Pending → Assigned → Dispatched → In Progress → On Site → Completed',
  },
  {
    icon: Users,
    color: 'purple' as const,
    title: 'Worker Accounts',
    description:
      'Add field workers to your team and give them login credentials for the mobile app. Go to Workers → Add Worker to create a new account.',
    tip: 'Workers log in with their email and password to receive jobs and share their GPS location.',
  },
  {
    icon: MapPin,
    color: 'orange' as const,
    title: 'Geofences',
    description:
      'Draw virtual boundaries around job sites, warehouses, or any location. Workers are automatically checked in when they arrive and checked out when they leave.',
    tip: 'Polygon mode: click to place corner points. Circle mode: click once to set the center, then drag the slider to set the radius.',
  },
  {
    icon: Smartphone,
    color: 'indigo' as const,
    title: 'Mobile App',
    description:
      'Workers download the FieldOps app and log in with their credentials. The app shows their assigned jobs, lets them update job status, and shares their GPS location.',
    tip: 'Make sure both this dashboard and the mobile app are connected to the same network when testing.',
  },
];

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   bar: 'bg-blue-600' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  bar: 'bg-blue-600' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', bar: 'bg-blue-600' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', bar: 'bg-blue-600' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', bar: 'bg-blue-600' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', bar: 'bg-blue-600' },
};

interface OnboardingTourProps {
  forceVisible?: boolean;
  onClose?: () => void;
}

export function OnboardingTour({ forceVisible = false, onClose }: OnboardingTourProps) {
  const [dismissed, setDismissed] = useState(true); // default hidden until mounted
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setDismissed(false);
  }, []);

  // When forceVisible is toggled on, reset step and show
  useEffect(() => {
    if (forceVisible) {
      setStep(0);
      setDismissed(false);
    }
  }, [forceVisible]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'done');
    setDismissed(true);
    onClose?.();
  };

  const next = () => {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else dismiss();
  };

  const prev = () => setStep((s) => s - 1);

  if (dismissed && !forceVisible) return null;

  const current = steps[step];
  const colors = colorMap[current.color];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Header row */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-medium text-slate-400">
              Step {step + 1} of {steps.length}
            </span>
            <button
              onClick={dismiss}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close tour"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Icon */}
          <div
            className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center mb-4`}
          >
            <Icon className={`w-7 h-7 ${colors.icon}`} />
          </div>

          {/* Content */}
          <h2 className="text-lg font-bold text-slate-900 mb-2">{current.title}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{current.description}</p>

          {current.tip && (
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700">💡 Tip: </span>
                {current.tip}
              </p>
            </div>
          )}

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mt-6 mb-5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === step
                    ? 'w-4 h-2 bg-blue-600'
                    : 'w-2 h-2 bg-slate-200 hover:bg-slate-300'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={prev} className="btn-secondary gap-1 px-3">
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={next}
              className="btn-primary flex-1 justify-center gap-1"
            >
              {step === steps.length - 1 ? (
                "Let's Go! 🚀"
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {step === 0 && (
            <button
              onClick={dismiss}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-3 transition-colors"
            >
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
