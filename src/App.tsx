import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import portfolioData from './data/portfolio.json';
import { Analytics } from "@vercel/analytics/react";

interface Command {
  input: string;
  output: string[];
  timestamp: Date;
}

// Helper function to make URLs clickable
const makeClickableLink = (url: string, text?: string): string => {
  if (!url || url.trim() === '#' || url.trim() === '') {
    return text || url; // Return original text or URL if not a valid link or just a placeholder
  }
  const displayText = text || url;
  // Ensure the URL has a protocol, default to https
  let href = url;
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
    if (url.includes('@') && !url.startsWith('mailto:')) { // Basic email check
      href = `mailto:${url}`;
    } else {
      href = `https://${url}`;
    }
  } else {
    href = url;
  }
  return `<a href="${href}" target="_blank" class="text-cyan-400 hover:underline">${displayText}</a>`;
};

// Helper function to generate skill bars
const generateSkillBar = (level: number): string => {
  const totalBars = 20;
  const filledBars = Math.round((level / 100) * totalBars);
  return '█'.repeat(filledBars) + ' '.repeat(totalBars - filledBars);
};

// Helper function to format file listing
const formatFileList = (): string[] => {
  const result = ['total 8'];
  portfolioData.files.forEach(file => {
    const typeIndicator = file.type === 'directory' ? '/' : '';
    result.push(`${file.permissions}  2 ${portfolioData.personal.username} ${portfolioData.personal.username} ${file.size} ${file.date} ${file.name}${typeIndicator}`);
  });
  return result;
};

// Generate commands from data
const generateCommands = () => {
  return {
    help: {
      description: 'Show available commands',
      output: [
        'Available commands:',
        '  help          - Show this help message',
        '  about         - Learn about me',
        '  skills        - View my technical skills',
        '  projects      - See my projects',
        // '  experience    - View my work experience',
        '  education     - See my educational background',
        '  contact       - Get my contact information',
        '  resume        - View resume and download link',
        '  download      - Download resume PDF',
        '  clear         - Clear the terminal',
        '  whoami        - Display current user',
        '  ls            - List directory contents',
        '  pwd           - Print working directory',
        '  date          - Show current date and time',
        '  neofetch      - Display system information',
      ]
    },
    about: {
      description: 'Learn about me',
      output: [
        `${portfolioData.personal.name} - ${portfolioData.personal.title}`,
        '',
        ...portfolioData.about
      ]
    },
    skills: {
      description: 'View technical skills',
      output: (() => {
        const result = ['Technical Skills:', ''];
        Object.entries(portfolioData.skills).forEach(([category, skills]) => {
          result.push(`${category}:`);
          skills.forEach((skill, index) => {
            const isLast = index === skills.length - 1;
            const prefix = isLast ? '  └──' : '  ├──';
            const bar = generateSkillBar(skill.level);
            result.push(`${prefix} ${skill.name.padEnd(20)} ${bar} ${skill.level}%`);
          });
          result.push('');
        });
        return result;
      })()
    },
    projects: {
      description: 'See my projects',
      output: (() => {
        const result = ['Projects Portfolio:', ''];
        const baseIndent = '   ';
        const firstLineItemPrefix = '├── ';
        const subsequentLineItemPrefix = '│   ';
        const lastLineItemPrefix = '└── ';

        const descriptionLabel = 'Description: ';
        // Indentation for continuation lines of description, aligns text with text after "Description: "
        const descriptionContinuationIndent = ' '.repeat(descriptionLabel.length); 

        // Approximate width for the description text content itself, before prefixes are added.
        const textContentWidth = 75; 

        portfolioData.projects.forEach((project, index) => {
          result.push(`${index + 1}. ${project.name}`);

          // Format Description
          const actualDescription = project.description;
          if (actualDescription && actualDescription.trim() !== '') {
            const segments = actualDescription.split('\\n'); // Split by literal \\n from JSON string, becomes \n in JS
            let isFirstLineOfOverallDescriptionOutput = true;

            segments.forEach((segment) => {
              // If the segment from JSON (after splitting by \\n) is empty,
              // and we're not at the very beginning of printing the description,
              // print an empty line with the continuation prefix.
              if (segment.trim() === '' && !isFirstLineOfOverallDescriptionOutput) {
                result.push(`${baseIndent}${subsequentLineItemPrefix}`);
                return; // continue to next segment
              }
              
              const words = segment.split(' ');
              let lineBuffer = '';

              for (let i = 0; i < words.length; i++) {
                const word = words[i];
                // Try adding the next word
                const potentialLine = lineBuffer === '' ? word : `${lineBuffer} ${word}`;

                if (potentialLine.length <= textContentWidth) {
                  lineBuffer = potentialLine; // Word fits, add to current line buffer
                } else {
                  // Word doesn't fit. Push the existing lineBuffer (if not empty).
                  if (lineBuffer !== '') {
                    if (isFirstLineOfOverallDescriptionOutput) {
                      result.push(`${baseIndent}${firstLineItemPrefix}${descriptionLabel}${lineBuffer}`);
                      isFirstLineOfOverallDescriptionOutput = false;
                    } else {
                      result.push(`${baseIndent}${subsequentLineItemPrefix}${descriptionContinuationIndent}${lineBuffer}`);
                    }
                  }
                  // Start a new line with the current word.
                  // If the word itself is too long, it will be on its own line.
                  lineBuffer = word; 
                  // If this new line (just the word) is pushed immediately because it's too long
                  if (word.length > textContentWidth && lineBuffer !== '') { // Check lineBuffer again in case word was pushed and cleared
                     if (isFirstLineOfOverallDescriptionOutput) {
                        result.push(`${baseIndent}${firstLineItemPrefix}${descriptionLabel}${lineBuffer}`);
                        isFirstLineOfOverallDescriptionOutput = false;
                     } else {
                        result.push(`${baseIndent}${subsequentLineItemPrefix}${descriptionContinuationIndent}${lineBuffer}`);
                     }
                     lineBuffer = ''; // Word has been pushed
                  }
                }
              }

              // Push any remaining text in lineBuffer for the current segment
              if (lineBuffer !== '') {
                if (isFirstLineOfOverallDescriptionOutput) {
                  result.push(`${baseIndent}${firstLineItemPrefix}${descriptionLabel}${lineBuffer}`);
                  isFirstLineOfOverallDescriptionOutput = false; 
                } else {
                  result.push(`${baseIndent}${subsequentLineItemPrefix}${descriptionContinuationIndent}${lineBuffer}`);
                }
              }
            });
          } else {
            // Handles empty or whitespace-only description
            result.push(`${baseIndent}${firstLineItemPrefix}${descriptionLabel}`);
          }

          result.push(`${baseIndent}${firstLineItemPrefix}Tech Stack: ${project.techStack}`);
          result.push(`${baseIndent}${firstLineItemPrefix}GitHub: ${makeClickableLink(project.github)}`);
          result.push(`${baseIndent}${lastLineItemPrefix}Status: ${project.status}`);
          result.push('');
        });
        return result;
      })()
    },
    // experience: {
    //   description: 'View work experience',
    //   output: (() => {
    //     const result = ['Work Experience:', ''];
    //     portfolioData.experience.forEach((exp, index) => {
    //       const isLast = index === portfolioData.experience.length - 1;
    //       result.push(`${exp.period} | ${exp.position}`);
    //       result.push(`├── Company: ${exp.company}`);
    //       result.push('├── Responsibilities:');
    //       exp.responsibilities.forEach((resp, respIndex) => {
    //         const isLastResp = respIndex === exp.responsibilities.length - 1;
    //         const prefix = isLastResp ? '│   └──' : '│   ├──';
    //         result.push(`${prefix} ${resp}`);
    //       });
    //       result.push(`└── Achievements: ${exp.achievements}`);
    //       if (!isLast) result.push('');
    //     });
    //     return result;
    //   })()
    // },
    education: {
      description: 'See educational background',
      output: (() => {
        const edu = portfolioData.education;
        const result = [
          'Education:',
          '',
          `${edu.period} | ${edu.degree}`,
          `├── University: ${edu.university}`,
          `├── GPA: ${edu.gpa}`,
          '├── Relevant Coursework:'
        ];
        
        edu.coursework.forEach((course, index) => {
          const isLast = index === edu.coursework.length - 1;
          const prefix = isLast ? '│   └──' : '│   ├──';
          result.push(`${prefix} ${course}`);
        });
        
        result.push(`└── Expected Graduation: ${edu.expectedGraduation}`);
        result.push('');
        // result.push('Certifications:');
        
        // edu.certifications.forEach((cert, index) => {
        //   const isLast = index === edu.certifications.length - 1;
        //   const prefix = isLast ? '└──' : '├──';
        //   result.push(`${prefix} ${cert}`);
        // });
        
        return result;
      })()
    },
    contact: {
      description: 'Get contact information',
      output: [
        'Contact Information:',
        '',
        `📧 Email:    ${makeClickableLink(portfolioData.contact.email)}`,
        `🔗 LinkedIn: ${makeClickableLink(portfolioData.contact.linkedin)}`,
        `🐙 GitHub:   ${makeClickableLink(portfolioData.contact.github)}`,
        `🌐 Website:  ${makeClickableLink(portfolioData.personal.website)}`,
        `📱 Phone:    ${portfolioData.contact.phone}`,
        `📍 Location: ${portfolioData.personal.location}`,
        '',
        'Feel free to reach out for opportunities, collaborations,',
        'or just to have a chat about technology!',
      ]
    },
    resume: {
      description: 'View resume and download link',
      output: [
        '═══════════════════════════════════════════════════════════',
        `                        ${portfolioData.personal.name.toUpperCase()}                          `,
        `                ${portfolioData.personal.title}                   `,
        '═══════════════════════════════════════════════════════════',
        '',
        `📧 ${makeClickableLink(portfolioData.contact.email)}  📱 ${portfolioData.contact.phone}`,
        `🔗 ${makeClickableLink(portfolioData.contact.linkedin)}  🐙 ${makeClickableLink(portfolioData.contact.github)}`,
        '',
        `🎓 ${portfolioData.education.degree} (${portfolioData.education.period}) - GPA: ${portfolioData.education.gpa}`,
        // `💼 ${portfolioData.experience[0].position} at ${portfolioData.experience[0].company}`,
        `🛠️ ${portfolioData.system.primaryLanguages}`,
        '',
        `📄 Download PDF: ${makeClickableLink(portfolioData.personal.resumeUrl)}`,
        '',
        'Use "education", "skills" for details!',
      ]
    },
    whoami: {
      description: 'Display current user',
      output: [portfolioData.personal.username]
    },
    pwd: {
      description: 'Print working directory',
      output: [`/home/${portfolioData.personal.username}/portfolio`]
    },
    ls: {
      description: 'List directory contents',
      output: formatFileList()
    },
    date: {
      description: 'Show current date and time',
      output: [new Date().toString()]
    },
    neofetch: {
      description: 'Display system information',
      output: [
        `<pre class="terminal-ascii-art">\n                   -\`                     <span class="text-green-400">${portfolioData.personal.username}</span><span class="text-white">@</span><span class="text-green-400">portfolio</span>\n                  .o+\`                    <span class="text-white">-----------------</span>\n                 \`ooo/                    <span class="text-blue-400">OS:</span> ${portfolioData.system.os}\n                \`+oooo:                   <span class="text-blue-400">Host:</span> ${portfolioData.system.host}\n               \`+oooooo:                  <span class="text-blue-400">Kernel:</span> ${portfolioData.system.kernel}\n               -+oooooo+:                 <span class="text-blue-400">Uptime:</span> ${portfolioData.system.uptime}\n             \`/:-:++oooo+:                <span class="text-blue-400">Shell:</span> ${portfolioData.system.shell}\n            \`/++++/+++++++:               <span class="text-blue-400">Resolution:</span> ${portfolioData.system.resolution}\n           \`/++++++++++++++:              <span class="text-blue-400">Terminal:</span> ${portfolioData.system.terminal}\n          \`/+++ooooooooo+++/              <span class="text-blue-400">CPU:</span> ${portfolioData.system.cpu}\n         ./ooosssso++osssssso+\`           <span class="text-blue-400">Memory:</span> ${portfolioData.system.memory}\n        .oossssso-\`\`\`\`/ossssss+\`          <span class="text-blue-400">Disk:</span> ${portfolioData.system.disk}\n       -osssssso.      :ssssssso.         <span class="text-blue-400">Skills:</span> <span class="text-red-400">█</span><span class="text-yellow-400">█</span><span class="text-green-400">█</span><span class="text-cyan-400">█</span><span class="text-blue-400">█</span><span class="text-purple-400">█</span><span class="text-pink-400">█</span><span class="text-white">█</span>\n      :osssssss/        osssso+++.        <span class="text-blue-400">Projects:</span> <span class="text-green-400">${portfolioData.system.projectsCompleted} completed</span>\n     /ossssssss/        +ssssooo/-        <span class="text-blue-400">Languages:</span> ${portfolioData.system.primaryLanguages}\n   \`/ossssso+/:-        -:/+osssso+-      <span class="text-blue-400">Frameworks:</span> ${portfolioData.system.frameworks}\n  \`+sso+:-\`                 \`.-/+oso:     <span class="text-blue-400">Database:</span> ${portfolioData.system.databases}\n \`++:.                           \`-/+/    <span class="text-blue-400">Tools:</span> ${portfolioData.system.tools}\n .\`                                 \`/    \n</pre>`
      ]
    }
  };
};

export default function App() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const COMMANDS = generateCommands();

  useEffect(() => {
    // Welcome message
    const welcomeCommand: Command = {
      input: '',
      output: [
        `Welcome to ${portfolioData.personal.name}'s Portfolio Terminal`,
        '',
        `<pre class="terminal-ascii-art">\n████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗      \n╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║      \n   ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║      \n   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║      \n   ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗ \n   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝ \n</pre>`,
        '',
        'Type "help" to get started or "about" to learn more about me.',
      ],
      timestamp: new Date()
    };
    setCommands([welcomeCommand]);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commands]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTyping]);

  useEffect(() => {
    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const executeCommand = async (input: string) => {
    const trimmedInput = input.trim().toLowerCase();
    const [command, ...args] = trimmedInput.split(' ');
    
    setIsTyping(true);
    
    let output: string[] = [];
    
    if (command === '') {
      output = [''];
    } else if (command === 'clear') {
      setCommands([]);
      setCurrentInput('');
      setIsTyping(false);
      return;
    } else if (command === 'resume') {
      output = COMMANDS.resume.output;
    } else if (command === 'download') {
      output = [
        'Initiating download...',
        '',
        `📄 Downloading: ${portfolioData.personal.name.replace(' ', '_')}_Resume.pdf`,
        `🔗 Source: ${makeClickableLink(portfolioData.personal.resumeUrl)}`,
        '',
        'If download doesn\'t start automatically, click the link above.',
      ];
      // Trigger actual download
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = portfolioData.personal.resumeUrl;
        link.download = `${portfolioData.personal.name.replace(' ', '_')}_Resume.pdf`;
        link.target = '_blank'; // Ensures it opens in a new tab if not downloaded directly
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 1000);
    } else if (COMMANDS[command as keyof typeof COMMANDS]) {
      output = COMMANDS[command as keyof typeof COMMANDS].output;
    } else {
      output = [
        `Command not found: ${command}`,
        'Type "help" to see available commands.',
      ];
    }

    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const newCommand: Command = {
      input: input,
      output: output,
      timestamp: new Date()
    };

    setCommands(prev => [...prev, newCommand]);
    setCurrentInput('');
    setIsTyping(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim() && !isTyping) {
      executeCommand(currentInput);
    }
  };

  const handleTerminalClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono overflow-hidden">
      <Analytics />
      <div className="h-screen flex flex-col">
        {/* Terminal Header */}
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="text-gray-300 text-sm">{portfolioData.personal.username}@portfolio: ~/portfolio</div>
          <div className="text-gray-500 text-xs">
            {currentTime.toLocaleTimeString()}
          </div>
        </div>

        {/* Terminal Content */}
        <div 
          ref={terminalRef}
          className="flex-1 p-4 overflow-y-auto cursor-text"
          onClick={handleTerminalClick}
        >
          <AnimatePresence>
            {commands.map((command, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-4"
              >
                {command.input && (
                  <div className="flex items-center mb-2">
                    <span className="text-blue-400">{portfolioData.personal.username}@portfolio</span>
                    <span className="text-white">:</span>
                    <span className="text-purple-400">~/portfolio</span>
                    <span className="text-white">$ </span>
                    <span className="text-green-400 ml-1">{command.input}</span>
                  </div>
                )}
                <div className="text-gray-300 whitespace-pre-line">
                  {command.output.map((line, lineIndex) => (
                    <motion.div
                      key={lineIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: lineIndex * 0.05 }}
                      dangerouslySetInnerHTML={{ __html: line }}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Current Input Line */}
          <form onSubmit={handleSubmit} className="flex items-center">
            <span className="text-blue-400">{portfolioData.personal.username}@portfolio</span>
            <span className="text-white">:</span>
            <span className="text-purple-400">~/portfolio</span>
            <span className="text-white">$ </span>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              className="bg-transparent border-none outline-none text-green-400 ml-1 flex-1"
              disabled={isTyping}
              autoComplete="off"
              spellCheck="false"
            />
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-green-400"
            >
              █
            </motion.span>
          </form>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-yellow-400 mt-2"
            >
              Processing command...
            </motion.div>
          )}
        </div>

        {/* Terminal Footer */}
        <div className="bg-gray-800 px-4 py-1 text-xs text-gray-400 border-t border-gray-600">
          <div className="flex justify-between">
            <span>Terminal Portfolio v1.0.0</span>
            <span>Press Ctrl+C to interrupt | Type 'help' for commands</span>
          </div>
        </div>
      </div>
    </div>
  );
}
