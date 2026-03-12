import React from 'react';
import renderer from 'react-test-renderer';
import { router } from 'expo-router';
import * as howToContent from '../../src/pages/HowTo/howToContent';
import HowToScreen from '../../app/how-to';

const mockRouter = router as { push: jest.Mock };

jest.mock('../../src/pages/HowTo/howToContent', () => ({
  ...jest.requireActual('../../src/pages/HowTo/howToContent'),
  getTutorialCapabilities: jest.fn(() => ({ userPasswordFeature: false })),
}));

const mockGetTutorialCapabilities = howToContent.getTutorialCapabilities as jest.Mock;

describe('HowToScreen', () => {
  const { HOW_TO_SECTIONS, getVisibleTutorialSections } = howToContent;
  const defaultSections = getVisibleTutorialSections(HOW_TO_SECTIONS, { userPasswordFeature: false });
  const defaultCardCount = defaultSections.reduce((n, s) => n + s.items.length, 0);

  beforeEach(() => {
    mockGetTutorialCapabilities.mockReturnValue({ userPasswordFeature: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderScreen = () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<HowToScreen />);
    });
    return (tree as renderer.ReactTestRenderer).root;
  };

  it('renders all visible tutorial cards', () => {
    const root = renderScreen();
    const cards = root.findAll(
      (node) =>
        typeof node.type === 'string' &&
        typeof node.props.testID === 'string' &&
        node.props.testID.startsWith('how-to-card-')
    );
    expect(cards).toHaveLength(defaultCardCount);
  });

  it('does not render change-password card by default', () => {
    const root = renderScreen();
    const card = root.findAll(
      (node) => typeof node.type === 'string' && node.props.testID === 'how-to-card-change-password'
    );
    expect(card).toHaveLength(0);
  });

  it('renders change-password card when feature flag is enabled', () => {
    mockGetTutorialCapabilities.mockReturnValue({ userPasswordFeature: true });

    const root = renderScreen();
    const card = root.findAll(
      (node) => typeof node.type === 'string' && node.props.testID === 'how-to-card-change-password'
    );
    expect(card).toHaveLength(1);
  });

  it('renders 3-5 steps for each visible card', () => {
    const root = renderScreen();
    defaultSections.forEach((section) => {
      section.items.forEach((item) => {
        const steps = root.findAll(
          (node) =>
            typeof node.type === 'string' &&
            typeof node.props.testID === 'string' &&
            node.props.testID.startsWith(`how-to-step-${item.id}-`)
        );
        expect(steps.length).toBeGreaterThanOrEqual(3);
        expect(steps.length).toBeLessThanOrEqual(5);
      });
    });
  });

  it('renders a CTA button for each visible card', () => {
    const root = renderScreen();
    const ctaButtons = root.findAll(
      (node) =>
        typeof node.type === 'string' &&
        typeof node.props.testID === 'string' &&
        node.props.testID.startsWith('how-to-cta-') &&
        !node.props.testID.startsWith('how-to-cta-container-')
    );
    expect(ctaButtons).toHaveLength(defaultCardCount);
  });

  it('calls router.push with the correct path on CTA press', () => {
    const root = renderScreen();
    const addBookCta = root.findAll(
      (node) => typeof node.type === 'string' && node.props.testID === 'how-to-cta-add-book'
    )[0];
    addBookCta.props.onPress();
    expect(mockRouter.push).toHaveBeenCalledWith('/book/add');
  });

  it('renders change-password CTA and navigates to /account when feature flag is enabled', () => {
    mockGetTutorialCapabilities.mockReturnValue({ userPasswordFeature: true });

    const root = renderScreen();
    const cta = root.findAll(
      (node) => typeof node.type === 'string' && node.props.testID === 'how-to-cta-change-password'
    )[0];
    expect(cta).toBeDefined();
    cta.props.onPress();
    expect(mockRouter.push).toHaveBeenCalledWith('/account');
  });
});
