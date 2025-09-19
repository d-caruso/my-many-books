# TypeScript Language Server Restart Instructions

The import path issues you're experiencing are typically resolved by restarting the TypeScript language server in your IDE. Here's how to do it:

## VS Code
1. Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "TypeScript: Restart TS Server"
3. Select and run the command

## Alternative VS Code Method
1. Open Command Palette: `Cmd+Shift+P`
2. Type "Developer: Reload Window"
3. This will reload the entire VS Code window

## What We Fixed

1. **TypeScript Configuration**: Updated `tsconfig.json` with proper React Native types
2. **Module Declarations**: Added comprehensive type declarations for all React Native modules
3. **Path Mappings**: Configured proper workspace package resolution
4. **Type Roots**: Set up proper type resolution paths

## Files Created/Updated

- `tsconfig.json` - Updated with proper React Native configuration
- `src/types/react-native.d.ts` - Comprehensive React Native type declarations
- `src/types/modules.d.ts` - Enhanced module declarations
- `src/types/globals.d.ts` - Global type declarations
- `src/react-native-env.d.ts` - React environment declarations
- `.vscode/settings.json` - VS Code TypeScript settings

## After Restart

Once you restart the TypeScript language server, you should see:
- ✅ No more "Cannot find module 'react'" errors
- ✅ No more "Cannot find module 'react-native'" errors
- ✅ No more "Module has no exported member" errors for React Native Paper
- ✅ Proper IntelliSense for all React hooks and components
- ✅ Correct type checking for workspace packages

If issues persist after restart, try:
1. Clear TypeScript cache: Delete `.tsbuildinfo` files if they exist
2. Restart your entire IDE
3. Run `npm run typecheck` to verify TypeScript compilation

The mobile app should now have full TypeScript support with proper import resolution!