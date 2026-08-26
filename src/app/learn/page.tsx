"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Code, ChevronRight, Clock, HelpCircle, Award } from "lucide-react";
import { SUBJECTS, Subject, Course } from "@/lib/learn/subjects";

export default function LearnPage() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0e16] text-gray-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0e16]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Learn</h1>
              <p className="text-[10px] text-gray-500">Master any subject with AI-powered practice</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/learn/practice" className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-all">
              Practice Mode
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {!selectedSubject ? (
          <>
            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { icon: BookOpen, label: "Subjects", value: SUBJECTS.length.toString(), color: "#3B82F6" },
                { icon: Code, label: "Courses", value: SUBJECTS.reduce((a, s) => a + s.courses.length, 0).toString(), color: "#10B981" },
                { icon: HelpCircle, label: "Questions", value: "3000+", color: "#8B5CF6" },
                { icon: Award, label: "Certificates", value: "10+", color: "#F59E0B" },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <stat.icon size={20} style={{ color: stat.color }} className="mb-2" />
                  <div className="text-xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Subject Grid */}
            <h2 className="text-xl font-bold text-white mb-4">Choose a Subject</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SUBJECTS.map((subject) => (
                <motion.button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject)}
                  className="text-left p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group"
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{subject.icon}</span>
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors mt-1" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">{subject.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{subject.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-600">
                    <span>{subject.courses.length} courses</span>
                    <span>•</span>
                    <span>{subject.courses.reduce((a, c) => a + c.totalQuestions, 0)}+ questions</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Subject Detail */}
            <button
              onClick={() => setSelectedSubject(null)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Subjects
            </button>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">{selectedSubject.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedSubject.name}</h2>
                <p className="text-sm text-gray-400">{selectedSubject.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedSubject.courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/learn/practice?course=${course.id}`}
      className="block p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{course.icon}</span>
        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/5 text-gray-400">
          {course.difficulty}
        </span>
      </div>
      <h3 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">{course.name}</h3>
      <p className="text-xs text-gray-500 mb-3">{course.description}</p>
      <div className="flex items-center gap-4 text-[10px] text-gray-600">
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {course.estimatedHours}h
        </span>
        <span className="flex items-center gap-1">
          <HelpCircle size={10} />
          {course.totalQuestions} questions
        </span>
        <span className="flex items-center gap-1">
          <BookOpen size={10} />
          {course.modules.length} modules
        </span>
      </div>
    </Link>
  );
}
