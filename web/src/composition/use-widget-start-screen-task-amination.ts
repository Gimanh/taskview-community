export const useWidgetStartScreenTaskAnimation = () => {
    return {
        initial: { opacity: 0, x: 30 },
        animate: { opacity: 1, x: 0 },
        // exit: { opacity: 0, y: -30 },
        transition: { duration: 0.4 },
    };
};
