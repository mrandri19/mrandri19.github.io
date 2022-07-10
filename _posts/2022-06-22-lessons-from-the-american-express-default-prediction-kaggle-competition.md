---
layout: post
title: "Lessons from the American Express Default Prediction Kaggle competition"
---

-   What I did
    -   Next steps
        -   Models
            -   LGBM + lag features + RAPIDS features
                    -   Then DART
            -   CatBoost
            -   Transformer
        -   After that start ensembling
            -   Try to take the mean of the log odds when ensembling (but I can only see its effect on the leaderboard, not in CV)

        -   More feature engineering (last - lag1, last - mean => 1386 features):
            -   https://www.kaggle.com/code/ragnar123/amex-lgbm-dart-cv-0-7977/notebook

        -   By analyzing the revision history of thedevastator's notebook I see that
            they are doing a XGB + LBGM DART + CatBoost DART ensemble

        -   Read more about how the integer dataset I have used handles nulls
        -   the integer dataset encodes low-cardinality features as int8, why
            not treat them as actual categories in the feature engineering phase?
            -   https://www.kaggle.com/code/raddar/amex-data-int-types-train

        -   scale_pos_weight?

        -   XGB/LGBM + SHAP

        -   Backward na filling for groupby last and other timeseries features

        -   Find a way to ensemble public models on a local CV
            and figure out if you can really reach 0.798 just by ensembling them
            What should I ensemble?

        -   Should I ensemble public models or try reproducing them?
            -   Do I want to do CV or just LB fitting?

    -   09/07/2022
        -   Today's plans:
            -   Ablation round2 on first, last
                -   w/ : 0.7952 CV, 0.795 LB 🎉
                -   and it is higher on LB than RAPIDS
            -   Ablation: XGBoost Categorical Handling
                -   just `enable_categorical` for now
                -   seems really slow
                -   w/ : 0.7955 on CV, 0.794 LB 🤔
                    Am I already underfitting the LB, or my CV wrong?
                    Try something else because 37min of training is boring
            -   Ablation: round2 on first, last. round3 on mean, std
                -   should I apply it before groupby?
                -   w/ : TODO(Andrea)
            -   LGBM
    -   08/07/2022
        -   CV consistency
            -   Adding sort_index after cudf.merge should fix it?
                -   It is, we can replicate the same number of num_boosted_rounds across
                    CV runs for every fold 🎉
            -   In any case it seems that the CV performance is always 0.7940 even if
                the number of trees varies quite a lot between folds/CV runs
        -   The performance between 03-xgb-new and 04-framework is slightly different, why?
            -   Read more about early stopping
                -   **If early stopping occurs, the model will have two additional**
                    **fields: bst.best_score, bst.best_iteration. Note that**
                    **xgboost.train() will return a model from the last iteration,**
                    **not the best one.**
                -   If early stopping is enabled during training, you can get predictions
                    from the best iteration with bst.best_iteration:
                    ypred = bst.predict(dtest, iteration_range=(0, bst.best_iteration + 1))
                -   It gives CV boost: 0.7935 CV to 0.7940 CV, but LB for latter
                    is 0.794, lower than 04-framework V2 which did not use early
                    stopping prediction or sort_index. Why?
        -   Now training is 15.5min thanks to GPU amex metric, results are
            consistent across runs
        -   Ablation: adding first features to numeric and difference
            -   w/o: 0.7943 CV, 15.5min CV time, 0.794 LB (rank 2)
            -   w/ : 0.7945 CV, 17.3min CV time, 0.794 LB (rank 1) p
            -   Conclusion so there seems to be some correlation between CV and LB
        -   Ablation: lag features
            -   w/o: 0.7945 CV, 17.3min CV time, 0.794 LB (rank 1)
            -   w/ : 0.7943 CV, 22.3min CV time, 0.794 LB (rank 3)
            -   This is interesting, why didn't it work? Too many features?
                Keep analyzing thedevastator's notebook
        -   Weighting
            -   using weight= in xgb.DMatrix it looks like the first tree can
                get to 0.84 valid-amex? But then I get 0.4798 CV?????
                cupy metric is wrong
            -   With the cupy metric it works but the performance is really bad
                the prediction mean is 0.444 and the CV is 0.7892 LB is 0.789
            -   At least there is great CV/LB correlation, this was a good datapoint
        -   Ablation: new vs old amex_metric_cupy
            -   Conclusion:
                -   New metric makes the training 26min rather than 17.3min, and the
                num_boost_rounds is the same as with the old, wrong metric.
                -   Could be worth keeping the old one, as it speeds up training.
                    Just restart working from v6 I guess
    -   07/07/2022
        -   RAPIDS' feature engineering: 588 columns
            -   categorical
                -   11
            -   numerical * {last, mean, std}
                -   177 * 3 = 531
            -    difference * {last, mean, std}
                -   14 * 3 = 42
            -   customer_ID, S_2, cid, target
                -   4
        -   XGB starter feature engineering: 918 columns
            -   categorical * {last, count, nunique}
                -   11 * 3 = 33
            -   numerical * {last, mean, std, max, min}
                -   177 * 5 = 885
        -   the other differences between the two are
            -   hyperparameters
            -   early_stopping_rounds
            -   feval
        -   How do I know which features are important between these two models?
            -   Should I bring categorical groupings into RAPIDS?
            -   Should I bring max, min into RAPIDS?
            -   Should I bring difference into XGB starter?
                -   How do I know that the difference features are actually bringing
                    the better performance?
            -   Should I add first?
                -   Should I add last - first and last / first?
        -   Ablation: do the difference features really help or is it better
            training?
            -   w/ : 0.7945 CV (full), 0.7945 CV (avg), 21min 13s CV time
                (I don't know but I know that a 7942 is 795 LB)
            -   w/o: 0.7940 CV (full), 0.7940 CV (avg), 22min 55s CV time,
                0.794 LB (I expect this to be 795 but lower then prev)
            -   I guess this is also a test whether the CV can identify such
                small differences.
                I am not too confident since two runs with same params can go
                from 7942 to 7948.
                How can I make my CV better? Stratification? More folds?
            -   Conclusion: without difference features we have slightly lower
                CV 7940 vs 7945 and lower LB 795 vs 794.
                So keep them, especially since they are just 42
        -   I have rewritten 03-xgb-new in 04-framework, now:
            -   feature engineering is clearer
            -   using StratifiedKFold for CV which seems more stable
                -   1st run: 0.7940 CV, 24min 49s CV time, 0.794 LB
                    But it's the highest one of the 794s, just under the 795
                    from 03-xgb-new
            -   WHY 32% GPU utilization?
                    Without custom_metric the GPU utilization is 84%. Does the
                    training time drop also to 10minutes?
                -   WTF is happening with the number of trees?
                    I am using early_stopping_rounds=500:
                    For fold 0, the lowest valid-logloss is 0.21721 at 2000 trees
                    Why is it showing 2674 trees then? How many trees does the model
                    returned by fold 0 really have?
                    -   0.7935 CV, 12min 25s CV time
                    -   Asssuming CV can detect differences of 0.0005,
                        optimizing the valid-amex is better than optimizing
                        valid-logloss, giving a 0.0005 CV improvement.

    -   06/07/2022
        -   RAPIDS XGB notebook
            -   But the results will not be fully comparable with the other as
                the CV folds are different...
        -   Ablation: try running this notebook with 5 CV folds
            -   See if using more folds, which results in more models in the
                average blend ensemble, improves the CV
                (it might not, with 4 folds it's 0.7950. It probably will be
                lower actually, since each model in the fold will have been
                trained on less data)
                and the LB (currently 0.795X, it might not? same argument as
                with CV, we will see).
            -   w/o: caveat: 4 folds   0.7950 CV (avg), 20min 29s CV time, 0.795 LB
            -   w/ : 0.7948 CV (full), 0.7952 CV (avg), 23min  6s CV time,
            -   how stable is it? re-run it
                -   this time some boosters have few trees: <1000
            -   w/ : 0.7942 CV (full), 0.7947 CV (avg), 22min 50s CV time, 0.795 LB (03-xgb-new)
                -   Current leaderboard
                    Last 0.796 score is 665th
                    Last 0.795 score is 868th
                    If we assume that the last scores have zeros behind the 3rd decimal, we can
                    compute that there are 223 people in [0.7950000, 0.7960000].

                    I am 838th which is 173th out of 223 people in [0.7950000, 0.7960000].
                    Thus 173 / 223 = 77.58% = 1 - 22.42%.

                    If we assume that the submissions are uniformly distributed in the interval,
                    then my actual score is 0.7952242.
        -   Ablation: don't round to two digits
            -   w/o: 0.7948 CV (full), 0.7952 CV (avg), 23min  6s CV time
                w/o: 0.7942 CV (full), 0.7947 CV (avg), 22min 50s CV time, 0.795 LB
            -   w/ : 0.7945 CV (full), 0.7945 CV (avg), 21min 13s CV time
            -   Conclusion: does not make a difference
        -   Is it useful to do a mean ensemble?
            -   Experiment:
                -   03-xgb-new: 0.794 CV, 0.795 LB
                -   amex-lgbm-quickstart: 0.795 LB (Unverified by me, we have to trust the notebook)
                -   mean ensemble:        0.796 LB (this thing with the sigmoid transform confuses me)
                -   Conclusion: ensembling models work. Let's make our own LGBM model now and ensemble that
    -   05/07/2022
        -   Bunch of stuff are float64, why?
            -   cudf .groupby.agg converts everything (ints, floats) to float64.
                Reconvert every float64 to float32 to use less memory.
                -   Does this improve training speed?
                    -   w/o: 10min 23s CV time
                    -   w/ : 10min 42s CV time
                    -   Conclusion: No
        -   Commented and cleaned up some code. Left to-dos but they are not
            critical for submission purposes.
        -   Let's try seeing if submitting the notebook directly works
            -   https://www.kaggle.com/code/mrandri19/02-xgb/notebook?scriptVersionId=100079606
            -   It works!
        -   Ablation: Dropout Additive Regression Trees (DART)
            -   w/o: 0.792 CV, 10m 23s CV time
            -   w/ : Cancelled, too slow
        -   Ablation: Better XGB hyperparameters (from RAPIDS XGB notebook)
            -   w/o: 0.792 CV, 10min 23s CV time
            -   w/ : 0.793 CV, 16min 17s CV time, 0.794 LB
            -   Conclusions
                -   increasing the max_depth results in a more complex model
                    which seems to achieve better performance but the CV
                    variance is also higher, how will it perform on the LB?
                -   +60% time seems worth doing for a performance boost
                -   Still, this does not perform as well as the notebook.
                    Is this because of the feature engineering?
        -   Quick experiment: PCA for feature selection does not seem worth
            doing
    -   30/06/2022
        -   Ablation: should I use the mean of per-fold metrics or just compute
            the metric on the full dataset? It should be exactly the same in
            theory, right?
            -   metric on full dataset: 0.792 CV, 10m 25s CV time
            -   mean of per-fold metric: 0.792 ± 0.002 CV, 10min 23s CV time
            -   Conclusion: use the full dataset, seems more solid.
                The CI interval does not really makes sense since imho.
        -   Ablation: Is submitting the mean ensemble of the CV models better
            than submitting the full-dataset model?
            To make it work I must implement prediction in chunks as the
            polars dataframe + dmatrix are too big for memory.
            I am moving to cudf since it seems faster
            -   w/ mean ensemble: 0.793 LB (02-xgb V10)
        -   devicequantiledmatrix, do I need it? (Doesn't look like it)
    -   28/06/2022
        -   Ablation: feature engineering with groupby on num. and cat.
            -   Loading the data and performing the feature engineering takes
                about 2min 4s train, 4min 31s test with polars
            -   w/ : 0.792 ± 0.002 CV, 10min 23s CV time
    -   27/06/2022
        -   Experiment: does gpu_hist reduce training time below 30 minutes?
            -   w/ : 0.788 ± 0.002 CV, 3min 33s 5-fold CV time
            -   w/o: 0.788 ± 0.002 CV, 31min 40s 5-fold CV time
            -   Conclusion: use the GPU (Kaggle gave me a P100)
    -   26/06/2022
        -   What are the differences that should get me 791 CV?
            -   Baseline
                -   w/o: 0.788 ± 0.002 CV
            -   Ablation: fill_null with -127
                -   w/ : 0.788 ± 0.002 CV
                -   Conclusion: don't fill_null
    -   25/06/2022
        -   Worked on a submission with polars + xgboost, following cdotte's
            baseline submission.
            Next steps are to implement KFold CV and understand why performance
            is so low, am I messing something up when merging the IDs and
            effectively making a random submission?
            -   Both zeros and randoms results in 0.020
            -   Ok I was doing something wrong with the merging of IDs, let's
                see if it looks correct now
            -   It works now, 0.762 by keeping both customer_ID and its hash in
                a column called ID. Then I groupby ID. Why do I even bother with
                doing this though?
            -   Next is cross validation. 5-fold CV on full dataset takes 30m.
            -   I tried predicting the test set using the output of the last
                fold. In theory this should scorea about 0.788.
                Indeed it performs 0.786
            -   What can I do next? I would like to reach that 0.793
                -   Feature engineering just like in the notebook
                -   FillNa with -127
                -   Because now mine kfold estimate is 0.788 while his is 0.791
                    And my LB is 0.786 while his is 0.793
                -   Mean ensemble the models from every fold
                -   See what else I have missed
    -   23/06/2022
        -   Read all notebooks in votes order starting from most voted
    -   22/06/2022
        -   Read all discussions in chronological order starting from oldest

## Main topics

-   Reducing memory usage
    -   Lots of columns are categorical/ordinal with some uniform noise added that we can denoise and then store in a int8.
        See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/328514
    -   Split data into 10 files with 50k customers, then you can load each one on the GPU and do feature engineering one at a time.
        Also, most models allow training on chunked data.
    -   Use int8, float16, etc.
        See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/328054

-   Exploring the datasets and its features
    -   Feature S_2 is a date and there are multiple dates per customer_ID
        -   There is value in treating this as a time-series, CDeotte says his best Transformer+GRU beats his best GBT
            -   Lots of features have seasonality patterns.
                See notebook: https://www.kaggle.com/code/pavelvod/amex-eda-revealing-time-patterns-of-features/comments
                See discussion: https://www.kaggle.com/code/pavelvod/amex-eda-even-more-insane-time-patterns-revealed/notebook
        -   Some people just look at the last item in this timeseries, so one row per customer_ID
        -   Not all customers have 13 dates.
            Apparently short-term customers have higher risk 43% but gap customers 27% and long-term customers 23% are similar
    -   Features B_29, S_9, D_87 have different distributions of missing values between train and test
        See notebook: https://www.kaggle.com/code/ambrosm/amex-eda-which-makes-sense
    -   Good EDA with nice plots, useful for seeing the distribution of features
        See notebook: https://www.kaggle.com/code/kellibelcher/amex-default-prediction-eda-lgbm-baseline
    -   Missing values are not missing-at-random
        See notebook: https://www.kaggle.com/code/raddar/understanding-na-values-in-amex-competition/notebook
    -   Good timeseries EDA
        See notebook: https://www.kaggle.com/code/pavelvod/amex-eda-revealing-time-patterns-of-features/notebook

-   Understanding the metric
-   Fast metric implementations
    -   I am just using the one from CDeotte's starter notebook
    -   https://www.kaggle.com/code/rohanrao/amex-competition-metric-implementations/comments

-   Cross-Validation
    -   5-fold StratifiedKFold because the target classes are imbalanced (26% true, 74% false)
        -   But CDeotte says the dataset is big enough to skip it.
            Train is 370k, valid is 90k.
    -   StratifiedGroupKFold
        -   If the dataset is divided into groups, e.g. multiple individuals,
            multiple samples from every individidual
        -   GroupKFold makes sure that the same group never is in both the train
            and validation sets.
        -   StratifiedKFold makes sure that the distribution of folds is the
            same as the full dataset.
        -   How can we apply GroupKFold to this competition?
            Perhaps to avoid shakeup somehow? The distribution of B_29 is quite
            different between train, public, private

-   Baselines (all use 5 folds)
    -   GBDT
        -   XGBoost
            See notebook: https://www.kaggle.com/code/cdeotte/xgboost-starter-0-793
            See notebook: https://www.kaggle.com/code/jiweiliu/rapids-cudf-feature-engineering-xgb/notebook (nice code layout)
            -   uses dataset `amex-data-integer-dtypes-parquet-format`
            -   uses only last observation per customer
            -   creates features by computing, grouping over observations:
                -   The mean, std, min, max, last of numerical features.
                -   The count, last, nunique of categorical features.
            -   Takes 13m
        -   LGBM
            See notebook: https://www.kaggle.com/code/ambrosm/amex-lightgbm-quickstart
            -   uses dataset `amex-data-integer-dtypes-parquet-format`
            -   uses only last observation per customer
            -   creates features by computing, grouping over observations:
                -   mean, min, max, last of numerical features.
            -   Takes 40m
        -   LGBM + DART (Dropout meets multiple Additive Regression Trees)
            See notebook: https://www.kaggle.com/code/ragnar123/amex-lgbm-dart-CV-0-7963
            -   Same feature engineering as XGBoost
            -   Nice structure
            -   To use DART with Early Stopping see comments and also the
                discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/332575
        -   Catboost
            See notebook: https://www.kaggle.com/code/huseyincot/amex-catboost-0-793/notebook
            And notebook: https://www.kaggle.com/code/jiweiliu/amex-catboost-rounding-trick
            -   Uses a weird pickled dataset. If you apply the same rounding trick that removes the uniform noise performance is much better
            -   Takes 8h
    -   NN
        -   RNN with GRU
            See notebook: https://www.kaggle.com/code/cdeotte/tensorflow-gru-starter-0-790
            -   Uses 3D dataset (customer x 13 x 188): https://www.kaggle.com/datasets/cdeotte/amex-data-for-transformers-and-rnns
            -   No scaling or feature engineering, label encoding of categorical columns
        -   Transformer
            See notebook: https://www.kaggle.com/code/cdeotte/tensorflow-transformer-0-790/comments
        -   Dense NN
            See notebook: https://www.kaggle.com/code/ambrosm/amex-keras-quickstart-1-training
            See notebook: https://www.kaggle.com/code/ambrosm/amex-keras-quickstart-2-inference
            -   Feature engineering
                -   avg, min, max, last
                -   categorical
            -   Takes 1h30m
            -   Very interesting comments: https://www.kaggle.com/code/ambrosm/amex-keras-quickstart-1-training/comments
        -   TabNet
            See notebook: https://www.kaggle.com/code/hinepo/amex-tabnet-training/comments

-   Best performing models
    See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/333000
    See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/334391
    -   NN
        -   Transformer: 0.794 LB
        -   Dense 0.791 LB
    -   GBT
        -   XGB: 0.798 LB
        -   LGBM: 0.798 LB


-   How to move beyond 0.795? See the comments by Raddar
    See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/331454
    -   Model ensembling work very well
        -   Different models use different features
        -   0.798 is achievable by ensembling fine-tuned public kernels
    -   Feature selection not too useful
    -   Feature engineering not impossible
    -   To reach 0.799 you need to blend NNs in the ensemble

-   What to do to improve model performance?
    See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/333953
    -   Hyperparameter Tuning (including random seeds)
    -   Feature Engineering with differences, multiplications, divisions
    -   Gets a 0.797 by ensembling just two models
    -   LGBM/XGB with DART, although adds 10x computation time

-   Public LB vs Private LB
    -   Public LB: customers whose statement is in 2019-04
        Private LB: customers whose statement is in 2019-10
        See notebook: https://www.kaggle.com/code/ambrosm/amex-eda-which-makes-sense
    -   See if there are differences between the two, such as B_29.
        See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/328756
    -   Adversarial validation (nice since we know public and private LBs)
        See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/330931
        See notebook: https://www.kaggle.com/code/zakopur0/adversarial-validation-private-vs-public
        B_29 is a perfect predictor of public vs private
        Let's keep going...

---

-   META: summary of the learnings (posted on 2 Jun)
    See discussion here: https://www.kaggle.com/competitions/amex-default-prediction/discussion/328565
    See discussion here: https://www.kaggle.com/competitions/amex-default-prediction/discussion/335892

---

## Topics I have just seen but not read

-   EDA with nonlinear clustering algorithms like UMAP/t-SNE

-   Understand feature interactions via xgboost.
    See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/329094

-   Ensembling probabilites via log-odds.
    See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/329103

-   Permutation feature importance:
    See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/331131

-   Feature P_2 is an internal credit rating, Feature D_39 is days_overdue
    See notebook: https://www.kaggle.com/code/raddar/deanonymized-days-overdue-feat-amex

-   Learning to rank to (try to) recover time features
    See notebook: https://www.kaggle.com/code/raddar/learning-to-rank-time-related-features

-   A faster self-attention? cool...
    See notebook: https://www.kaggle.com/code/mayukh18/amex-cossquareformer-starter/notebook

-   https://github.com/pfnet-research/xfeat
-   https://github.com/nyanp/nyaggle
