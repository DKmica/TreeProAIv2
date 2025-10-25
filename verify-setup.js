#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🌲 TreePro AI - Setup Verification\n');
console.log('='.repeat(50));

let hasErrors = false;
let warnings = [];

// Check Node.js version
console.log('\n📦 Checking Node.js version...');
try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion >= 18) {
        console.log(`✅ Node.js ${nodeVersion} (OK)`);
    } else {
        console.log(`❌ Node.js ${nodeVersion} (Need 18+)`);
        hasErrors = true;
    }
} catch (e) {
    console.log('❌ Could not determine Node.js version');
    hasErrors = true;
}

// Check npm
console.log('\n📦 Checking npm...');
try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✅ npm ${npmVersion} (OK)`);
} catch (e) {
    console.log('❌ npm not found');
    hasErrors = true;
}

// Check PostgreSQL
console.log('\n🐘 Checking PostgreSQL...');
try {
    execSync('psql --version', { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ PostgreSQL installed');
    
    try {
        execSync('pg_isready', { encoding: 'utf8', stdio: 'pipe' });
        console.log('✅ PostgreSQL is running');
    } catch (e) {
        console.log('⚠️  PostgreSQL is not running');
        warnings.push('Start PostgreSQL before running the app');
    }
} catch (e) {
    console.log('❌ PostgreSQL not found');
    hasErrors = true;
}

// Check environment files
console.log('\n🔐 Checking environment files...');

if (fs.existsSync('.env')) {
    console.log('✅ .env file exists');
    const envContent = fs.readFileSync('.env', 'utf8');
    
    if (envContent.includes('VITE_GEMINI_API_KEY=') && !envContent.includes('your_gemini_api_key_here')) {
        console.log('✅ VITE_GEMINI_API_KEY is set');
    } else {
        console.log('⚠️  VITE_GEMINI_API_KEY not configured');
        warnings.push('Add your Gemini API key to .env');
    }
    
    if (envContent.includes('VITE_GOOGLE_MAPS_KEY=') && !envContent.includes('your_google_maps_api_key_here')) {
        console.log('✅ VITE_GOOGLE_MAPS_KEY is set');
    } else {
        console.log('⚠️  VITE_GOOGLE_MAPS_KEY not configured');
        warnings.push('Add your Google Maps API key to .env');
    }
} else {
    console.log('❌ .env file not found');
    console.log('   Run: cp .env.example .env');
    hasErrors = true;
}

if (fs.existsSync('backend/.env')) {
    console.log('✅ backend/.env file exists');
    const backendEnvContent = fs.readFileSync('backend/.env', 'utf8');
    
    if (backendEnvContent.includes('DATABASE_URL=')) {
        console.log('✅ DATABASE_URL is set');
    } else {
        console.log('⚠️  DATABASE_URL not configured');
        warnings.push('Configure DATABASE_URL in backend/.env');
    }
} else {
    console.log('❌ backend/.env file not found');
    console.log('   Run: cp backend/.env.example backend/.env');
    hasErrors = true;
}

// Check dependencies
console.log('\n📚 Checking dependencies...');

if (fs.existsSync('node_modules')) {
    console.log('✅ Frontend dependencies installed');
} else {
    console.log('⚠️  Frontend dependencies not installed');
    warnings.push('Run: npm install');
}

if (fs.existsSync('backend/node_modules')) {
    console.log('✅ Backend dependencies installed');
} else {
    console.log('⚠️  Backend dependencies not installed');
    warnings.push('Run: cd backend && npm install');
}

// Check database
console.log('\n🗄️  Checking database...');
try {
    const dbList = execSync('psql -lqt', { encoding: 'utf8', stdio: 'pipe' });
    if (dbList.includes('treeproai')) {
        console.log('✅ Database "treeproai" exists');
        
        try {
            const tableCount = execSync('psql -d treeproai -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \'public\';"', { encoding: 'utf8', stdio: 'pipe' }).trim();
            if (parseInt(tableCount) >= 7) {
                console.log('✅ Database tables initialized');
            } else {
                console.log('⚠️  Database tables not initialized');
                warnings.push('Run: psql -d treeproai -f backend/init.sql');
            }
        } catch (e) {
            console.log('⚠️  Could not verify database tables');
            warnings.push('Run: psql -d treeproai -f backend/init.sql');
        }
    } else {
        console.log('⚠️  Database "treeproai" not found');
        warnings.push('Run: createdb treeproai && psql -d treeproai -f backend/init.sql');
    }
} catch (e) {
    console.log('⚠️  Could not check database (PostgreSQL may not be running)');
}

// Check required files
console.log('\n📄 Checking required files...');
const requiredFiles = [
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    'index.html',
    'App.tsx',
    'backend/server.js',
    'backend/db.js',
    'backend/init.sql',
    'backend/package.json'
];

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} not found`);
        hasErrors = true;
    }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 Summary:\n');

if (hasErrors) {
    console.log('❌ Setup has ERRORS that must be fixed\n');
} else if (warnings.length > 0) {
    console.log('⚠️  Setup has warnings:\n');
    warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
    });
    console.log('\n✅ Core setup is complete, but address warnings before running\n');
} else {
    console.log('✅ All checks passed! Your setup is complete.\n');
    console.log('🚀 Ready to start:\n');
    console.log('   Terminal 1: cd backend && npm run dev');
    console.log('   Terminal 2: npm run dev');
    console.log('   Browser:    http://localhost:3000\n');
}

process.exit(hasErrors ? 1 : 0);