import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Textarea, Select } from './ui';
import { UserCheck, Check, Sparkles } from 'lucide-react';

export default function PersonaTab({ config = {}, onSave, isSaving }) {
  const [profile, setProfile] = useState({
    name: '',
    headline: '',
    currentRole: '',
    yearsOfExperience: 'Junior to Mid-Senior',
    primaryTechStack: '',
    githubUrl: '',
    portfolioUrl: '',
    resumeBio: ''
  });

  useEffect(() => {
    if (config.profile) {
      setProfile({
        name: config.profile.name || '',
        headline: config.profile.headline || '',
        currentRole: config.profile.currentRole || '',
        yearsOfExperience: config.profile.yearsOfExperience || 'Junior to Mid-Senior',
        primaryTechStack: config.profile.primaryTechStack || '',
        githubUrl: config.profile.githubUrl || '',
        portfolioUrl: config.profile.portfolioUrl || '',
        resumeBio: config.profile.resumeBio || ''
      });
    }
  }, [config]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ profile });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-400" />
            Engineering Persona & Resume Context
          </h2>
          <p className="text-xs text-slate-400">
            The AI models study this background so posts accurately reflect your real technical depth and projects.
          </p>
        </div>
        <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Persona'}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Basics */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2">Profile Basics</h3>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Full Name / Display Name</label>
            <Input name="name" value={profile.name} onChange={handleChange} placeholder="e.g. John Doe" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">LinkedIn Headline</label>
            <Input name="headline" value={profile.headline} onChange={handleChange} placeholder="e.g. Backend & Fullstack Engineer | Scalable Systems & Node.js" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Target Role</label>
            <Input name="currentRole" value={profile.currentRole} onChange={handleChange} placeholder="e.g. Backend / Fullstack Software Engineer" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Experience Tier</label>
            <Select name="yearsOfExperience" value={profile.yearsOfExperience} onChange={handleChange}>
              <option value="Junior">Junior (0-2 years)</option>
              <option value="Junior to Mid-Senior">Junior to Mid-Senior (2-4 years)</option>
              <option value="Mid-Senior">Mid-Senior (4-6 years)</option>
              <option value="Senior / Lead">Senior / Lead (6+ years)</option>
            </Select>
          </div>
        </Card>

        {/* Tech Stack & Links */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2">Technical Focus & Links</h3>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Primary Stack & Architectural Concepts</label>
            <Textarea
              name="primaryTechStack"
              value={profile.primaryTechStack}
              onChange={handleChange}
              rows={3}
              placeholder="e.g. Node.js, Express, PostgreSQL, Redis, Docker, System Design, REST APIs, Clean Architecture"
            />
            <p className="text-xs text-slate-500">Recruiters search for these keywords.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">GitHub Profile URL (Included in first comment)</label>
            <Input name="githubUrl" value={profile.githubUrl} onChange={handleChange} placeholder="https://github.com/yourusername" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Portfolio / Demo Website URL</label>
            <Input name="portfolioUrl" value={profile.portfolioUrl} onChange={handleChange} placeholder="https://yourportfolio.dev" />
          </div>
        </Card>

        {/* Bio Context */}
        <Card className="md:col-span-2 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2">Resume & Engineering Narrative</h3>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Detailed Technical Bio / Past Project Highlights</label>
            <Textarea
              name="resumeBio"
              value={profile.resumeBio}
              onChange={handleChange}
              rows={4}
              placeholder="Paste your resume summary, high-impact features built, concurrency bottlenecks solved, or database optimizations done..."
            />
            <p className="text-xs text-slate-500">Gemini & ChatGPT will ground real technical anecdotes in this context.</p>
          </div>
        </Card>
      </div>
    </form>
  );
}
